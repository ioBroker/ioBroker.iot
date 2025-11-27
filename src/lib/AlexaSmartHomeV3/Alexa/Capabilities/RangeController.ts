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
        configuration?: AlexaV3RangeConfiguration;
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
            capabilityResources: this.capabilityResources,
        };
    }

    get capabilityResources(): { friendlyNames: AlexaV3FriendlyName[] } {
        if (this.unit === '°C' || this.unit === '°F') {
            return {
                friendlyNames: [
                    {
                        '@type': 'asset',
                        value: {
                            assetId: 'Alexa.Setting.Temperature',
                        },
                    },
                    {
                        '@type': 'text',
                        value: {
                            text: 'Temperatur',
                            locale: 'de-DE',
                        },
                    },
                    {
                        '@type': 'text',
                        value: {
                            text: 'Temperature',
                            locale: 'en-US',
                        },
                    },
                    {
                        '@type': 'text',
                        value: {
                            text: 'Temperatura',
                            locale: 'es-MX',
                        },
                    },
                    {
                        '@type': 'text',
                        value: {
                            text: 'Température',
                            locale: 'fr-CA',
                        },
                    },
                ],
            };
        }

        return {
            friendlyNames: [
                {
                    '@type': 'asset',
                    value: {
                        assetId: 'Alexa.Setting.Preset',
                    },
                },
                {
                    '@type': 'text',
                    value: {
                        text: 'Niveau',
                        locale: 'de-DE',
                    },
                },
                {
                    '@type': 'text',
                    value: {
                        text: 'Level',
                        locale: 'en-US',
                    },
                },
                {
                    '@type': 'text',
                    value: {
                        text: 'Nivel',
                        locale: 'es-MX',
                    },
                },
                {
                    '@type': 'text',
                    value: {
                        text: 'Niveau',
                        locale: 'fr-CA',
                    },
                },
            ],
        };
    }

    get presets(): {
        rangeValue: number;
        presetResources: {
            friendlyNames: AlexaV3FriendlyName[];
        };
    }[] {
        return [
            {
                rangeValue: this.max,
                presetResources: {
                    friendlyNames: [
                        {
                            '@type': 'asset',
                            value: {
                                assetId: 'Alexa.Value.Maximum',
                            },
                        },
                        {
                            '@type': 'asset',
                            value: {
                                assetId: 'Alexa.Value.High',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Maximum',
                                locale: 'de-DE',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Highest',
                                locale: 'en-US',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Fast',
                                locale: 'en-US',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Alta',
                                locale: 'es-MX',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Élevée',
                                locale: 'fr-CA',
                            },
                        },
                    ],
                },
            },
            {
                rangeValue: (this.max + this.min) / 2,
                presetResources: {
                    friendlyNames: [
                        {
                            '@type': 'asset',
                            value: {
                                assetId: 'Alexa.Value.Medium',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Mitte',
                                locale: 'de-DE',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Medium',
                                locale: 'en-US',
                            },
                        },
                    ],
                },
            },
            {
                rangeValue: this.min,
                presetResources: {
                    friendlyNames: [
                        {
                            '@type': 'asset',
                            value: {
                                assetId: 'Alexa.Value.Minimum',
                            },
                        },
                        {
                            '@type': 'asset',
                            value: {
                                assetId: 'Alexa.Value.Low',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Minimum',
                                locale: 'de-DE',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Lowest',
                                locale: 'en-US',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Slow',
                                locale: 'en-US',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Baja',
                                locale: 'es-MX',
                            },
                        },
                        {
                            '@type': 'text',
                            value: {
                                text: 'Faible',
                                locale: 'fr-CA',
                            },
                        },
                    ],
                },
            },
        ];
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
            presets: this.presets,
        };
    }
}
