import type { AlexaV3DirectiveValue, AlexaV3Request, AlexaV3ThermostatMode } from '../../types';

import { asEnum } from '../../Helpers/Utils';
import Base, { type ControlStateInitObject } from './Base';

export default class ThermostatMode extends Base {
    private readonly _supportedModes: string[];

    constructor(opts: ControlStateInitObject) {
        super(opts);
        if (!opts.supportedModes || !Array.isArray(opts.supportedModes) || opts.supportedModes.length === 0) {
            throw new Error('ThermostatMode control requires supportedModes array with at least one mode');
        }
        // set mode to be AUTO for thermostats without mode at all
        this.currentValue = this.setId ? undefined : ThermostatMode.AUTO;
        this._supportedModes = opts.supportedModes as string[];
        this._supportedModesAsEnum = asEnum(this._supportedModes);
    }

    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.name === 'SetThermostatMode';
    }

    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        return this._supportedModesAsEnum[alexaValue as AlexaV3ThermostatMode] || 0;
    }

    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        return this._supportedModesAsEnum[parseInt(value as string, 10)] || 'AUTO';
    }

    matches(event: AlexaV3Request): boolean {
        return ThermostatMode.matches(event);
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return event.directive.payload.thermostatMode?.value;
    }

    get supportedModes(): any[] {
        return this._supportedModes;
    }

    static get AUTO(): string {
        return 'AUTO';
    }
    static get COOL(): string {
        return 'COOL';
    }
    static get ECO(): string {
        return 'ECO';
    }
    static get HEAT(): string {
        return 'HEAT';
    }
    static get EM_HEAT(): string {
        return 'EM_HEAT';
    }
    static get OFF(): string {
        return 'OFF';
    }
}
