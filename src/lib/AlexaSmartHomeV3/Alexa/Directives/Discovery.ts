import AlexaResponse from '../AlexaResponse';
import Base from './Base';
import type { AlexaV3Request } from '../../types';
import type DeviceManager from '../../DeviceManager';
import { validateDiscoveryResponse } from '../../Helpers/DiscoveryValidator';
import type Device from '../../Device';
import type Logger from '../../Helpers/Logger';

export default class Discovery extends Base {
    /**
     * The skill does not forward ChangeReports to Alexa (no event gateway), so no property may be announced as
     * proactively reported: Alexa would wait for changes that never come.
     * "retrievable" stays as the capability declares it: Alexa asks with ReportState, e.g. for the tile in the app
     * or "What's the temperature in the kitchen?".
     *
     * @param obj Discovery response or a part of it
     */
    static setAllProactivelyReportedFalse(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                Discovery.setAllProactivelyReportedFalse(obj[i]);
            }
            return obj;
        }

        if (typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
                if (key === 'proactivelyReported') {
                    obj[key] = false;
                } else {
                    Discovery.setAllProactivelyReportedFalse(obj[key]);
                }
            }
        }

        return obj;
    }

    handle(event: AlexaV3Request, endpointManager: DeviceManager): Promise<AlexaResponse> {
        this.log.debug(`handling Discovery`);
        this.log.silly(`${JSON.stringify(event)}`);

        return Promise.resolve(
            Discovery.discoveryResponse(endpointManager.endpoints, this.log, event?.directive?.header?.messageId),
        );
    }

    /**
     * Describes the devices exactly as Alexa gets them on discovery. The proactive Alexa.Discovery reports use it
     * too, so Alexa never learns two different versions of the same device.
     *
     * @param endpoints all collected devices
     * @param log logger for the warnings
     * @param messageId message ID of the Discover directive, if any
     */
    static discoveryResponse(endpoints: Device[], log: Logger, messageId?: string): AlexaResponse {
        const response = new AlexaResponse({
            namespace: Discovery.namespace,
            name: 'Discover.Response',
            messageId,
        });

        let count = 0;

        endpoints.forEach(endpoint => {
            count++;
            if (count > 300) {
                log.warn(
                    `Too many devices. Alexa supports up to 300 devices. ${endpoint.friendlyName} will not be discovered.`,
                );
                return;
            }
            response.addPayloadEndpoint({
                endpointId: endpoint.id,
                description: endpoint.description || undefined,
                friendlyName: endpoint.friendlyName,
                displayCategories: endpoint.displayCategories || [],
                capabilities:
                    endpoint.capabilities?.map(capability => response.asEndpointCapability(capability.alexaResponse)) ||
                    [],
            });
        });

        const json = response.get();

        Discovery.setAllProactivelyReportedFalse(json);

        validateDiscoveryResponse(json, log);

        return json;
    }
}
