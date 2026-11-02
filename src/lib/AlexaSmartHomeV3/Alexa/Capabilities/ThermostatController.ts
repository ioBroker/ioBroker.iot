import ThermostatMode from '../Properties/ThermostatMode';
import TargetSetpoint from '../Properties/TargetSetpoint';
import Base from './Base';
import type {
    AlexaV3ActionMapping,
    AlexaV3FriendlyName,
    AlexaV3ModeConfiguration,
    AlexaV3Namespace,
    AlexaV3StateMapping,
    AlexaV3ThermostatMode,
} from '../../types';
import type { ControlStateInitObject } from '../Properties/Base';

export default class ThermostatController extends Base {
    private readonly _thermostatMode: ThermostatMode;

    constructor(setPointOpts: ControlStateInitObject, modeOpts: ControlStateInitObject) {
        super();

        this._thermostatMode = new ThermostatMode(modeOpts);
        this._properties = [new TargetSetpoint(setPointOpts), this._thermostatMode];
    }

    get version(): string {
        return '3.2';
    }

    get thermostatMode(): ThermostatMode {
        return this._thermostatMode;
    }

    get alexaResponse(): {
        interface: AlexaV3Namespace;
        version: string;
        instance?: string;
        properties: {
            supported: { name: string }[];
            proactivelyReported: boolean;
            retrievable: boolean;
        };
        configuration?: {
            ordered: boolean;
            supportedModes: AlexaV3ThermostatMode[];
            supportsScheduling?: boolean;
        };
        semantics?: {
            actionMappings: AlexaV3ActionMapping[];
            stateMappings: AlexaV3StateMapping[];
        };
        capabilityResources?: {
            friendlyNames: AlexaV3FriendlyName[];
        };
    } {
        return {
            interface: this.namespace,
            version: this.version,
            properties: this.discoverableProperties,
            configuration: this.configuration,
        };
    }

    get configuration(): AlexaV3ModeConfiguration {
        // The position of a mode is its value in ioBroker, so the list has gaps for values without an Alexa mode,
        // e.g. {0: AUTO, 1: MANU, 2: ECO}. Alexa must get every mode once and no null.
        const modes = [...new Set((this._thermostatMode?.supportedModes || []).filter(mode => mode))];
        return {
            ordered: false,
            supportedModes: modes.length ? modes : ['AUTO'],
        };
    }
}
