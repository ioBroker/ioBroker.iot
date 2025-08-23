import Device from './Device';
import * as Utils from './Helpers/Utils';
import Directives from './Alexa/Directives';
import Controls from './Controls';
import type Control from './Controls/Control';
import Logger from './Helpers/Logger';
import AdapterProvider from './Helpers/AdapterProvider';
import AlexaResponse from './Alexa/AlexaResponse';
import IotProxy from './Helpers/IotProxy';
import RateLimiter from './Helpers/RateLimiter';
import OverallDailyRateLimitExceeded from './Exceptions/OverallDailyRateLimitExceeded';
import HourlyDeviceRateLimitExceeded from './Exceptions/HourlyDeviceRateLimitExceeded';
import type { AlexaV3EndpointID, AlexaV3Request, IotExternalPatternControl } from './types';
import ChangeReport from './Alexa/Directives/ChangeReport';
import Discovery from './Alexa/Directives/Discovery';
import ReportState from './Alexa/Directives/ReportState';
import { randomUUID } from 'node:crypto';

export default class DeviceManager {
    private lang: ioBroker.Languages = 'en';
    private devices: Device[] = [];
    private subscribed: string[] = [];
    private log: Logger;
    private eventsPausedTill = 0; // timestamp

    private collecting = false;
    private recollect = false;

    /** Creates a Device Manager */
    constructor() {
        this.log = new Logger(this);
    }

    informAboutStatesChange(): void {
        void AdapterProvider.get().setState('smart.updates3', true, true);
    }

    get language(): ioBroker.Languages {
        return this.lang;
    }

    set language(value: ioBroker.Languages) {
        this.lang = value;
    }

    matchDirective(event: AlexaV3Request): ChangeReport | Discovery | ReportState | null {
        if (ChangeReport.matches(event)) {
            return new ChangeReport();
        }
        if (Discovery.matches(event)) {
            return new Discovery();
        }
        if (ReportState.matches(event)) {
            return new ReportState();
        }

        return null;
    }

    get endpoints(): Device[] {
        return this.devices;
    }

    endpointById(id: AlexaV3EndpointID): Device | undefined {
        return this.devices.find(device => device.id === id);
    }

    addDevice(device: Device): void {
        this.devices.push(device);
    }

    toDevice(
        detectedControls: IotExternalPatternControl[],
        friendlyName: string,
        autoDetected: boolean,
        roomName: string | undefined,
        funcName: string | undefined,
        toggle?: boolean,
    ): Device | undefined {
        const controls: Control[] = [];

        this.log.debug(`merging controls to a device with name ${friendlyName}`);

        detectedControls.forEach(item => {
            this.log.silly(`processing control: ${JSON.stringify(item)}`);
            this.log.debug(`${item.type} added to ${friendlyName}`);
            if (item.type === 'AdjustableControl') {
                controls.push(new Controls.AdjustableControl(item));
            } else if (item.type === 'AdjustablePercentageControl') {
                controls.push(new Controls.AdjustablePercentageControl(item));
            } else if (item.type === 'AirCondition') {
                controls.push(new Controls.AirCondition(item));
            } else if (item.type === 'Blind') {
                controls.push(new Controls.Blind(item));
            } else if (item.type === 'ContactSensor') {
                controls.push(new Controls.ContactSensor(item));
            } else if (item.type === 'Ct') {
                controls.push(new Controls.Ct(item));
            } else if (item.type === 'Dimmer') {
                controls.push(new Controls.Dimmer(item));
            } else if (item.type === 'Door') {
                controls.push(new Controls.Door(item));
            } else if (item.type === 'Gate') {
                controls.push(new Controls.Gate(item));
            } else if (item.type === 'Hue') {
                controls.push(new Controls.Hue(item));
            } else if (item.type === 'Light') {
                controls.push(new Controls.Light(item));
            } else if (item.type === 'Lock') {
                controls.push(new Controls.Lock(item));
            } else if (item.type === 'Motion') {
                controls.push(new Controls.Motion(item));
            } else if (item.type === 'ReadOnlyDetector') {
                controls.push(new Controls.ReadOnlyDetector(item));
            } else if (item.type === 'Slider') {
                controls.push(new Controls.Slider(item));
            } else if (item.type === 'Socket') {
                controls.push(new Controls.Socket(item));
            } else if (item.type === 'Temperature') {
                controls.push(new Controls.Temperature(item));
            } else if (item.type === 'Thermostat') {
                controls.push(new Controls.Thermostat(item));
            } else if (item.type === 'VacuumCleaner') {
                controls.push(new Controls.VacuumCleaner(item));
            } else if (item.type === 'Volume') {
                controls.push(new Controls.Volume(item));
            } else if (item.type === 'VolumeGroup') {
                controls.push(new Controls.VolumeGroup(item));
            } else if (item.type === 'Window') {
                controls.push(new Controls.Window(item));
            } else {
                this.log.debug(`control of type ${item.type} not supported yet. Skipped.`);
            }
        });

        if (controls.length === 0) {
            // the controls are not supported yet...
            return;
        }

        // create and add a new device to the collected devices
        this.addDevice(
            new Device({
                id: friendlyName,
                friendlyName,
                controls,
                autoDetected,
                roomName,
                funcName,
                toggle,
            }),
        );
    }

    getName(name: ioBroker.StringOrTranslated | undefined): string {
        if (!name) {
            return '';
        }
        if (typeof name === 'object') {
            return name[this.lang] || name.en || '';
        }
        return name;
    }

    async collectEndpoints(): Promise<void> {
        if (this.collecting) {
            this.log.debug(`collecting devices already in progress. Skipping...`);
            this.recollect = true;
            return;
        }
        this.collecting = true;
        this.log.debug(`(re)collecting devices...`);
        try {
            // const discoveryNeeded = this.devices.length > 0;

            this.devices = [];
            const defaultToggle = AdapterProvider.get().config.defaultToggle || false;

            // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
            let detectedControls = await Utils.controls(AdapterProvider.get(), this.lang);

            this.log.debug(`type detector found ${detectedControls.length} controls`);

            // Normally, every control is a smart device. But due to the iobroker concept of 'rooms and functions'
            // multiple controls might be merged to a single device.

            // as long as not all controls mapped to a device...

            // detectedControls = detectedControls.filter(c => ['light', 'dimmer'].includes(c.type));
            const createdGroups: string[] = [];

            while (detectedControls.length) {
                // take the next control
                const control = detectedControls[0];
                let processedControls: any[] = [];

                if (control.room?.common?.name) {
                    if (control.functionality?.common?.name) {
                        // controls in the same room with the same functionality
                        processedControls = detectedControls.filter(
                            item =>
                                control.room &&
                                item.room?.id === control.room.id &&
                                control.functionality &&
                                item.functionality?.id === control.functionality.id,
                        );
                        this.toDevice(
                            processedControls,
                            Utils.friendlyNameByRoomAndFunctionName(control, this.lang),
                            true,
                            this.getName(control.room?.common?.name),
                            this.getName(control.functionality?.common?.name),
                            processedControls[0].toggle === true || processedControls[0].toggle === false
                                ? processedControls[0].toggle
                                : defaultToggle,
                        );
                    } else {
                        this.log.debug(
                            `Control of type [${control.type}] assigned to room [${this.getName(control.room.common.name)}] has no function. Skipped.`,
                        );
                    }
                } else if (control.groupNames) {
                    // no room, but smart name (not only one)
                    control.groupNames.forEach(groupName => {
                        if (!createdGroups.includes(groupName)) {
                            createdGroups.push(groupName);
                            processedControls = detectedControls.filter(item => item.groupNames?.includes(groupName));
                            this.toDevice(
                                processedControls,
                                this.getName(groupName),
                                false,
                                undefined,
                                undefined,
                                processedControls[0].toggle === true || processedControls[0].toggle === false
                                    ? processedControls[0].toggle
                                    : defaultToggle,
                            );
                        }
                    });
                } else {
                    // neither room nor smart name
                    this.log.debug(`Control of type [${control.type}] has neither room no smart name. Skipped.`);
                }

                if (processedControls.length === 0) {
                    processedControls = [control];
                }

                // remove processed controls
                const objectIds = processedControls.map(item => item.object.id);
                detectedControls = detectedControls.filter(item => item.object && !objectIds.includes(item.object.id));
            }

            // done
            this.log.debug(`finished collecting devices. there is/are ${this.devices.length} device(s) in total`);
            for (const device of this.devices) {
                this.log.debug(`${device.toString()}`);
            }

            // a new discovery process is needed in case we had already devices and device collection was
            // triggered again by, e.g., a change in room/function enums
            // if (discoveryNeeded) {
            //     this.log.info(`Please delete all managed by ioBroker devices in your Alexa app and then start discovery`);
            // }

            // collect all relevant states to subscribe to updates
            const stateIds = new Set(
                this.devices
                    .flatMap(d => d.controls)
                    .flatMap(item => item.supported)
                    .flatMap(item => item.properties)
                    .map(item => item.getId)
                    .filter(id => id),
            );
            this.log.debug(`registering for updates of total ${stateIds.size} states`);
            const promises = [];
            const newSubscribed = Array.from(stateIds);
            // subscribe to updates
            for (const id of newSubscribed) {
                this.log.silly(`subscribing to updates of ${id}`);
                if (!this.subscribed.includes(id)) {
                    this.subscribed.push(id);
                    promises.push(AdapterProvider.subscribe(id));
                }
            }

            this.subscribed.sort();

            // wait till all promises are settled
            const results = await Promise.allSettled(promises);

            // unsubscribe from unused states
            for (let i = this.subscribed.length - 1; i >= 0; i--) {
                const id = this.subscribed[i];
                if (!newSubscribed.includes(id)) {
                    this.log.silly(`unsubscribing from updates of ${id}`);
                    this.subscribed.splice(i, 1);
                    await AdapterProvider.unsubscribe(id);
                }
            }

            const failedReasons = results.filter(item => item.status !== 'fulfilled').flatMap(item => item.reason);
            if (failedReasons.length) {
                this.log.debug(`failed to subscribe for updates of ${failedReasons.length} states`);
                try {
                    for (const reason of failedReasons) {
                        this.log.silly(
                            `failed subscribing: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`,
                        );
                    }
                } catch {
                    // nop
                }
            }
        } catch (e) {
            this.log.error(`failed to collect devices: ${e}`);
        }

        this.collecting = false;

        // if during the collection a new collection was triggered, start collecting again
        if (this.recollect) {
            this.recollect = false;
            setTimeout(() => this.collectEndpoints(), 1000);
        }
    }

    async destroy(): Promise<void> {
        const promises = [];
        for (const id of this.subscribed) {
            this.log.silly(`unsubscribing from updates of ${id}`);
            promises.push(AdapterProvider.subscribe(id));
        }
        await Promise.allSettled(promises);

        this.subscribed = [];
    }

    publishStateChange(stateChange: AlexaResponse): void {
        if (this.eventsPausedTill < Date.now()) {
            this.log.silly(`publishing ${JSON.stringify(stateChange)}`);
            IotProxy.publishStateChange(stateChange);
        }
    }

    pauseEvents(): void {
        this.eventsPausedTill = Date.now() + 30 * 60 * 1000; // 30 minutes
    }

    async executeWithinRateLimits(
        endpointId: AlexaV3EndpointID,
        awaitable: () => Promise<AlexaResponse>,
        errorResponse: AlexaResponse,
    ): Promise<AlexaResponse> {
        try {
            await RateLimiter.incrementAndGet(endpointId);
            return await awaitable();
        } catch (error) {
            if (error instanceof OverallDailyRateLimitExceeded || error instanceof HourlyDeviceRateLimitExceeded) {
                this.log.warn(error.message);
            } else {
                this.log.error(error.message);
            }

            return errorResponse;
        }
    }

    async handleAlexaEvent(event: AlexaV3Request): Promise<AlexaResponse> {
        this.log.debug(`incoming Alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);
        if (!event?.directive?.header) {
            throw new Error('Alexa event header is missing');
        }

        let response: AlexaResponse;
        const directive = this.matchDirective(event);
        if (directive) {
            response = await directive.handle(event, this);
        } else {
            const endpointId = event?.directive?.endpoint?.endpointId;
            const device = endpointId ? this.endpointById(endpointId) : undefined;

            if (device) {
                if (device.supports(event)) {
                    response = await this.executeWithinRateLimits(
                        endpointId!,
                        async () => {
                            response = await device.handle(event);
                            if (!AlexaResponse.isErrorResponse(response)) {
                                // report state change via voice interaction
                                const propertyName = response.context?.properties[0].name;
                                const responseEvent = ChangeReport.get(
                                    device.id,
                                    propertyName || '',
                                    false,
                                    event.directive.header.messageId,
                                );
                                const directive = this.matchDirective(responseEvent);
                                if (directive) {
                                    // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                                    // const stateChange = await directive.handle(responseEvent, this);
                                    // get device state (not just one control)
                                    const deviceState = await device.reportState();
                                    if (JSON.stringify(device.lastReportedState) !== JSON.stringify(deviceState)) {
                                        device.lastReportedState = deviceState;
                                        // fire state change report to Alexa
                                        // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                                        // this.publishStateChange(stateChange);
                                        this.informAboutStatesChange();
                                    } else {
                                        this.log.debug(
                                            `ignoring state change event for ${endpointId} due to the same_ value [${JSON.stringify(deviceState)}]`,
                                        );
                                    }
                                }
                            }
                            return response;
                        },
                        AlexaResponse.endpointUnreachable(event.directive.header.messageId).get(),
                    );
                } else {
                    response = AlexaResponse.directiveNotSupportedByDevice(
                        device.friendlyName,
                        event.directive.header.namespace,
                        event.directive.header.messageId,
                        event.directive.header.payloadVersion,
                    ).get();
                }
            } else {
                response = AlexaResponse.endpointUnreachable(event.directive.header.messageId).get();
            }
        }

        this.log.silly(`response: ${JSON.stringify(response)}`);
        return response;
    }

    async handleStateUpdate(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        // ignore updates not confirmed by a corresponding device
        if (!state?.ack) {
            this.log.silly(`ignoring state change event for ${id} due to state.ack == ${state?.ack}`);
            return;
        }

        let notFound = true;

        for (const device of this.devices) {
            const property = device.controls
                .flatMap(item => item.supported)
                .flatMap(item => item.properties)
                .find(item => item.getId === id);

            if (property) {
                notFound = false;
                if (property.currentValue === state.val) {
                    this.log.debug(`ignoring state change event for ${id} due to the same value [${state.val}]`);
                } else {
                    property.currentValue = state.val;

                    const responseEvent = Directives.ChangeReport.get(
                        device.id,
                        property.propertyName,
                        true,
                        randomUUID(),
                    );
                    const directive = this.matchDirective(responseEvent);
                    if (directive) {
                        // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                        // const stateChange = await directive.handle(event, this);

                        // get device state (not just one control)
                        const deviceState = await device.reportState();

                        if (JSON.stringify(device.lastReportedState) !== JSON.stringify(deviceState)) {
                            device.lastReportedState = deviceState;
                            this.informAboutStatesChange();
                            // fire state change report to Alexa

                            // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                            // await this.executeWithinRateLimits(device.id, async () =>
                            //     this.publishStateChange(stateChange), undefined);
                        } else {
                            this.log.debug(
                                `ignoring state change event for ${id} due to the same_ value [${JSON.stringify(deviceState)}]`,
                            );
                        }
                    }
                }

                // should be the only device having the id => stop processing here
                break;
            }
        }

        // this should never happen
        if (notFound) {
            this.log.debug(`state id ${id} doesn't belong to any device`);
        }
    }
}
