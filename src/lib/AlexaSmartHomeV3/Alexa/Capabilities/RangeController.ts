import Properties from '../Properties';
import Base from './Base';
import type { ControlStateInitObject } from '../Properties/Base';
import type {
    AlexaV3ActionMapping,
    AlexaV3FriendlyName,
    AlexaV3Namespace,
    AlexaV3RangeConfiguration,
    AlexaV3StateMapping,
    AlexaV3UnitOfMeasure,
} from '../../types';

export default class RangeController extends Base {
    private readonly min: number;
    private readonly max: number;
    private readonly unit: string;
    constructor(opts: ControlStateInitObject) {
        super();
        this._properties = [new Properties.RangeValue(opts)];
        this.min = opts.setState?.common.min || 0;
        this.max = opts.setState?.common.max || 100;
        this.unit = opts.setState?.common.unit || '';
    }

    get alexaResponse(): {
        interface: AlexaV3Namespace;
        version: string;
        instance: string;
        properties: {
            supported: { name: string }[];
            proactivelyReported: boolean;
            retrievable: boolean;
        };
        configuration?: {
            supportedRange: {
                minimumValue: number;
                maximumValue: number;
                precision: 1;
            };
            unitOfMeasure?: AlexaV3UnitOfMeasure;
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
            instance: 'Range.Value',
            version: this.version,
            properties: this.discoverableProperties,
            configuration: this.configuration,
        };
    }

    get configuration(): AlexaV3RangeConfiguration {
        // Map known units to Alexa units
        let unitOfMeasure: AlexaV3UnitOfMeasure | undefined;
        switch (this.unit) {
            case '°C':
                unitOfMeasure = 'Alexa.Unit.Temperature.Celsius';
                break;
            case '°F':
                unitOfMeasure = 'Alexa.Unit.Temperature.Fahrenheit';
                break;
            case '%':
                unitOfMeasure = 'Alexa.Unit.Percent';
                break;
        }

        return {
            supportedRange: {
                minimumValue: this.min,
                maximumValue: this.max,
                precision: 1,
            },
            unitOfMeasure,
        };
    }
}
