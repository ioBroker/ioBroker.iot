import { v4 as uuidv4 } from 'uuid';
import type { Types } from '@iobroker/type-detector';

import { endpointId, defaultIfNullOrEmpty, distinctByPropertyName } from './Helpers/Utils';
import Logger from './Helpers/Logger';
import type { AlexaV3Category, AlexaV3Namespace, AlexaV3ReportedState, AlexaV3Request } from './types';
import type Control from './Controls/Control';
import type { Base as CapabilitiesBase } from './Alexa/Capabilities/Base';
import type AlexaResponse from './Alexa/AlexaResponse';

/**
 * This class hides the different iobroker controls representing physical devices from Alexa
 * and makes them appear as a single endpoint.
 * Due to differences in Alexa's and iobroker's endpoint/devices concepts, we have to merge some of the
 * by the type-detector detected controls to a single device, so that multiple controls are considered
 * to be the same endpoint from Alexa's perspective.
 * This leads to a situation where while Alexa believes controlling a single endpoint by sending a directive
 * to change the endpoint's state, in reality, the states of multiple controls, i.e. physical devices, are changed.
 */
export default class Device {
    public log: Logger;
    public id: string;
    public friendlyName: string;
    public controls: Control[];
    public autoDetected: boolean;
    public possibleTypes: Types[];
    public typeWasDetected: boolean;
    public roomName?: string;
    public funcName?: string;
    public toggle?: boolean;
    public description?: string;
    public lastReportedState?: any;

    constructor(opts: {
        id: string;
        friendlyName: string;
        controls: Control[];
        autoDetected?: boolean;
        roomName?: string;
        funcName?: string;
        toggle?: boolean;
        typeWasDetected: boolean;
        possibleTypes: Types[];
    }) {
        this.typeWasDetected = opts.typeWasDetected;
        this.possibleTypes = opts.possibleTypes;
        this.log = new Logger(this);
        this.id = defaultIfNullOrEmpty<string>(endpointId(opts.id), uuidv4());
        this.friendlyName = defaultIfNullOrEmpty<string>(opts.friendlyName, uuidv4());
        this.controls = defaultIfNullOrEmpty<Control[]>(opts.controls, []);
        this.autoDetected = !!opts.autoDetected;
        this.roomName = opts.roomName;
        this.funcName = opts.funcName;
        this.toggle = opts.toggle;
    }

    supports(event: AlexaV3Request): boolean {
        return this.controls.find(c => c.supports(event)) !== undefined;
    }

    async handle(event: AlexaV3Request): Promise<AlexaResponse> {
        this.log.debug(`handling alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);

        const promises: Promise<AlexaResponse>[] = [];
        if (this.toggle) {
            // get current state
            event.currentState = await this.reportState();
        }

        this.controls.forEach(control => promises.push(control.handle(event)));
        const results = await Promise.allSettled(promises);

        const fulfilled = results.find(item => item.status === 'fulfilled');

        return fulfilled !== undefined ? fulfilled.value : (results[0] as any).reason;
    }

    async reportState(): Promise<AlexaV3ReportedState[]> {
        const promises: Promise<AlexaV3ReportedState[]>[] = [];
        this.controls.forEach(control => promises.push(control.reportState()));
        const results = await Promise.allSettled(promises);

        const properties: {
            namespace: AlexaV3Namespace;
            instance?: string;
            name: string;
            value: any;
        }[] = results.filter(item => item.status === 'fulfilled').flatMap(item => item.value);

        return distinctByPropertyName<{
            namespace: AlexaV3Namespace;
            instance?: string;
            name: string;
            value: any;
        }>(properties, 'name', true);
    }

    get capabilities(): CapabilitiesBase[] {
        const allCapabilities = this.controls.flatMap(item => item.supported);
        return distinctByPropertyName(allCapabilities, 'namespace');
    }

    get displayCategories(): AlexaV3Category[] {
        return Array.from(new Set(this.controls.flatMap(item => item.categories)));
    }

    toString(): string {
        const controls = this.controls;
        const controlsAsString = function (): string {
            let repr = ' (Controls: ';
            for (const ctrl of controls) {
                repr += `${ctrl.toString()}, `;
            }
            repr = `${repr.slice(0, -2)})`;
            return repr;
        };
        return `${this.friendlyName}${controlsAsString()}`;
    }
}
