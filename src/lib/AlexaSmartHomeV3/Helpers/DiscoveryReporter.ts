import { createHash, randomUUID } from 'node:crypto';
import AdapterProvider from './AdapterProvider';
import IotProxy from './IotProxy';
import Logger from './Logger';
import Discovery from '../Alexa/Directives/Discovery';
import type Device from '../Device';
import type { AlexaV3DiscoverAppliance, AlexaV3DiscoveryReport, AlexaV3EndpointID } from '../types';

/**
 * Keeps Alexa's list of devices in line with ioBroker without the user having to run a discovery.
 *
 * Alexa never forgets an endpoint on its own: one that is missing from a later discovery stays in the app as
 * "Device is unresponsive" and cannot even be removed there. So we remember what Alexa got on its last discovery
 * and, after the devices were collected again, send what changed since as Alexa.Discovery AddOrUpdateReport and
 * DeleteReport.
 *
 * Nothing is sent before the first discovery after the update, as only then we know what Alexa has.
 */
export default class DiscoveryReporter {
    /** Own state with `{[endpointId]: hash of its description}` of everything Alexa knows */
    static STATE_ID = 'smart.alexa3Discovered';
    /** collectEndpoints() runs on every relevant object change, so wait till the user is done */
    static SYNC_DELAY_MS = 10_000;
    /** An IoT message may have 128 KB */
    static MAX_REPORT_SIZE = 100_000;
    static MAX_ENDPOINTS_PER_REPORT = 100;

    private readonly log: Logger;
    /** `undefined` - not read yet, `null` - no discovery since this feature exists */
    private known: Record<AlexaV3EndpointID, string> | null | undefined;
    private timer: NodeJS.Timeout | null = null;

    constructor() {
        this.log = new Logger(this);
    }

    static hash(endpoint: AlexaV3DiscoverAppliance): string {
        return createHash('sha256').update(JSON.stringify(endpoint)).digest('base64');
    }

    /** Alexa just ran a discovery, so from now on it knows exactly these endpoints */
    async discovered(endpoints: AlexaV3DiscoverAppliance[]): Promise<void> {
        const known: Record<AlexaV3EndpointID, string> = {};
        endpoints.forEach(endpoint => (known[endpoint.endpointId] = DiscoveryReporter.hash(endpoint)));
        await this.store(known);
    }

    /**
     * The devices were collected again: tell Alexa what changed, once nothing changed for a while
     *
     * @param getDevices returns the devices as they are when the timer fires, or null while they are being collected
     * @param paused is true while the cloud does not accept events
     */
    schedule(getDevices: () => Device[] | null, paused: () => boolean): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.timer = null;
            if (paused()) {
                // try again later, the pause lasts 30 minutes
                this.schedule(getDevices, paused);
                return;
            }
            const devices = getDevices();
            if (!devices) {
                return;
            }
            this.sync(devices).catch(e => this.log.error(`cannot report changed devices to Alexa: ${e}`));
        }, DiscoveryReporter.SYNC_DELAY_MS);
        // must not keep the process alive on its own
        this.timer.unref?.();
    }

    /** Sends to Alexa what changed since the last discovery or the last sync */
    async sync(devices: Device[]): Promise<void> {
        const known = await this.load();
        if (!known) {
            this.log.debug('no discovery since the start of tracking, so it is unknown what Alexa has');
            return;
        }
        if (!IotProxy.device) {
            this.log.debug('not connected to the cloud, Alexa will be told about changed devices later');
            return;
        }

        const endpoints = Discovery.discoveryResponse(devices, this.log).event?.payload.endpoints || [];
        if (!endpoints.length && Object.keys(known).length) {
            // Rather keep stale devices than wipe out everything in Alexa because of a failed detection
            this.log.warn(
                `No devices found, but Alexa knows ${Object.keys(known).length}. Run the discovery in Alexa if all devices are really gone.`,
            );
            return;
        }

        const current: Record<AlexaV3EndpointID, string> = {};
        const changed: AlexaV3DiscoverAppliance[] = [];
        for (const endpoint of endpoints) {
            current[endpoint.endpointId] = DiscoveryReporter.hash(endpoint);
            if (known[endpoint.endpointId] !== current[endpoint.endpointId]) {
                changed.push(endpoint);
            }
        }
        const deleted = Object.keys(known)
            .filter(id => !current[id])
            .map(endpointId => ({ endpointId }));

        if (!changed.length && !deleted.length) {
            return;
        }

        this.log.info(`Telling Alexa about ${changed.length} new or changed and ${deleted.length} removed device(s)`);
        DiscoveryReporter.chunks(changed).forEach(chunk =>
            IotProxy.publishDiscoveryReport(DiscoveryReporter.report('AddOrUpdateReport', chunk)),
        );
        DiscoveryReporter.chunks(deleted).forEach(chunk =>
            IotProxy.publishDiscoveryReport(DiscoveryReporter.report('DeleteReport', chunk)),
        );

        await this.store(current);
    }

    destroy(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    static report(
        name: 'AddOrUpdateReport' | 'DeleteReport',
        endpoints: AlexaV3DiscoverAppliance[] | { endpointId: AlexaV3EndpointID }[],
    ): AlexaV3DiscoveryReport {
        return {
            event: {
                header: {
                    namespace: 'Alexa.Discovery',
                    name,
                    payloadVersion: '3',
                    messageId: randomUUID(),
                },
                payload: {
                    endpoints,
                    // IotProxy puts the client ID in here, the cloud replaces it with the user's access token
                    scope: { type: 'BearerToken', token: 'INVALID' },
                },
            },
        };
    }

    /** Splits the endpoints so that every report fits into one IoT message */
    static chunks<T>(endpoints: T[]): T[][] {
        const result: T[][] = [];
        let chunk: T[] = [];
        let size = 0;
        for (const endpoint of endpoints) {
            const endpointSize = JSON.stringify(endpoint).length;
            if (
                chunk.length &&
                (chunk.length >= DiscoveryReporter.MAX_ENDPOINTS_PER_REPORT ||
                    size + endpointSize > DiscoveryReporter.MAX_REPORT_SIZE)
            ) {
                result.push(chunk);
                chunk = [];
                size = 0;
            }
            chunk.push(endpoint);
            size += endpointSize;
        }
        if (chunk.length) {
            result.push(chunk);
        }
        return result;
    }

    private async load(): Promise<Record<AlexaV3EndpointID, string> | null> {
        if (this.known === undefined) {
            try {
                const state = await AdapterProvider.get().getStateAsync(DiscoveryReporter.STATE_ID);
                this.known = state?.val ? JSON.parse(state.val as string) : null;
            } catch (e) {
                this.log.warn(`cannot read the devices known to Alexa: ${e}`);
                this.known = null;
            }
        }
        return this.known!;
    }

    private async store(known: Record<AlexaV3EndpointID, string>): Promise<void> {
        this.known = known;
        await AdapterProvider.get().setStateAsync(DiscoveryReporter.STATE_ID, JSON.stringify(known), true);
    }
}
