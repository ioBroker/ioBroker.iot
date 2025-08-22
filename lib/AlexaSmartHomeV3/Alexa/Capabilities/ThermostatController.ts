import ThermostatMode from '../Properties/ThermostatMode';
import TargetSetpoint from '../Properties/TargetSetpoint';
import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';
import type { AlexaV3ActionMapping, AlexaV3FriendlyName, AlexaV3Namespace, AlexaV3StateMapping } from '../../types';

export default class ThermostatController extends Base {
    private _thermostatMode: ThermostatMode | undefined;

    get version(): string {
        return '3.2';
    }

    initProperties(): PropertiesBase[] {
        this._thermostatMode = new ThermostatMode();
        return [new TargetSetpoint(), this._thermostatMode];
    }

    get thermostatMode(): ThermostatMode {
        return this._thermostatMode!;
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
            supportedModes: any[];
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

    get configuration(): {
        ordered: boolean;
        supportedModes: string[];
        supportsScheduling?: boolean;
    } {
        return {
            ordered: false,
            supportedModes: this._thermostatMode!.supportedModes,
        };
    }
}
