import type { device as DeviceModule } from 'aws-iot-device-sdk';

import DeviceManager from './AlexaSmartHomeV3/DeviceManager';
import AdapterProvider from './AlexaSmartHomeV3/Helpers/AdapterProvider';
import IotProxy from './AlexaSmartHomeV3/Helpers/IotProxy';
import RateLimiter from './AlexaSmartHomeV3/Helpers/RateLimiter';
import type { AlexaSH3ControlDescription, AlexaSH3DeviceDescription, AlexaV3Request } from './AlexaSmartHomeV3/types';
import type AlexaResponse from './AlexaSmartHomeV3/Alexa/AlexaResponse';
import type { IotAdapter } from '../main';

export default class AlexaSH3 {
    private readonly deviceManager: DeviceManager;

    constructor(options: { adapter: IotAdapter; iotDevice: DeviceModule; iotClientId: string }) {
        this.deviceManager = new DeviceManager();
        AdapterProvider.init(options.adapter);
        IotProxy.init(options.iotDevice, options.iotClientId, options.adapter.config.login);
        RateLimiter.init().catch((err: Error) => options.adapter.log.error(err.message));
        // Subscribe on enum changes
        options.adapter.subscribeForeignObjects('enum.functions.*');
        options.adapter.subscribeForeignObjects('enum.rooms.*');
    }

    setLanguage(lang: ioBroker.Languages): void {
        this.deviceManager.language = lang;
    }

    async process(event: AlexaV3Request): Promise<AlexaResponse> {
        return await this.deviceManager.handleAlexaEvent(event);
    }

    async updateDevices(): Promise<void> {
        await this.deviceManager.collectEndpoints();
    }

    setValidTill(validTill: number): void {
        this.deviceManager?.setValidTill(validTill);
    }

    async getDevices(collectDevices: boolean): Promise<AlexaSH3DeviceDescription[]> {
        if (this.deviceManager && collectDevices) {
            await this.deviceManager.collectEndpoints();
        }
        const endpoints = this.deviceManager?.endpoints || [];

        const result: AlexaSH3DeviceDescription[] = [];

        for (let p = 0; p < endpoints.length; p++) {
            const endpoint = endpoints[p];
            const controls: AlexaSH3ControlDescription[] = [];

            for (let c = 0; c < endpoint.controls.length; c++) {
                const control = endpoint.controls[c];
                let supported: string[] = [];
                let enforced: string[] = [];
                control.supported.forEach(item =>
                    item.properties.forEach(
                        prop => !supported.includes(prop.constructor.name) && supported.push(prop.constructor.name),
                    ),
                );
                control.enforced.forEach(item =>
                    item.properties.forEach(
                        prop => !enforced.includes(prop.constructor.name) && enforced.push(prop.constructor.name),
                    ),
                );

                supported = supported.map(prop => prop.replace(/^[A-Z]/, c => c.toLowerCase())).sort();

                enforced = enforced.map(prop => prop.replace(/^[A-Z]/, c => c.toLowerCase())).sort();

                controls.push({
                    type: control.log._component,
                    states: control.states,
                    // always sort by id, so the GUI can address the group by the first control
                    supported,
                    // always sort by id, so the GUI can address the group by the first control
                    enforced,
                    state: await control.reportState(),
                });
            }
            // always sort by id, so the GUI can address the group by the first control
            controls.sort((c1, c2) => (c1.type > c2.type ? -1 : c1.type < c2.type ? 1 : 0));

            const device: AlexaSH3DeviceDescription = {
                controls,
                friendlyName: endpoint.friendlyName,
                autoDetected: endpoint.autoDetected,
                possibleTypes: endpoint.possibleTypes,
                typeWasDetected: endpoint.typeWasDetected,
                funcName: endpoint.funcName,
                roomName: endpoint.roomName,
                id: endpoint.id,
                type: endpoint.log._component,
                state: await endpoint.reportState(),
            };
            result.push(device);
        }

        return result;
    }

    async handleStateUpdate(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        await this.deviceManager.handleStateUpdate(id, state);
    }

    async handleObjectChange(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
        // Handle enum changes
        if (obj) {
            // An object was changed
            // console.log(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // An object was deleted
            // console.log(`object ${id} deleted`);
        }

        // either an enum was deleted or changed => re-collect devices

        // intentionally not waiting for the promise to resolve
        await this.deviceManager.collectEndpoints();
    }

    pauseEvents(): void {
        this.deviceManager.pauseEvents();
    }

    async destroy(): Promise<void> {
        await this.deviceManager.destroy();
        await AdapterProvider.get().unsubscribeForeignObjectsAsync('enum.functions.*');
        await AdapterProvider.get().unsubscribeForeignObjectsAsync('enum.rooms.*');
    }
}
