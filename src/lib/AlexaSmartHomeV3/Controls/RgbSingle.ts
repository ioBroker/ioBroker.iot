import Capabilities from '../Alexa/Capabilities';
import {
    configuredRangeOrDefault,
    denormalize_0_100,
    normalize_0_100,
    closestFromList,
    rgbwToHex,
    hal2rgb,
    rgb2hal,
} from '../Helpers/Utils';
import AdapterProvider from '../Helpers/AdapterProvider';
import AdjustableControl from './AdjustableControl';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import type BrightnessController from '../Alexa/Capabilities/BrightnessController';
import Brightness from '../Alexa/Properties/Brightness';
import ColorTemperatureInKelvin from '../Alexa/Properties/ColorTemperatureInKelvin';
import type ColorTemperatureController from '../Alexa/Capabilities/ColorTemperatureController';
import type PowerController from '../Alexa/Capabilities/PowerController';
import PowerState from '../Alexa/Properties/PowerState';
import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    AlexaV3Request,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';
import Color from '../Alexa/Properties/Color';

// ### RGB Light Single [rgbSingle]
//
// RGB light with one state of color. Could be HEX #RRGGBB, or rgb(0-255,0-255,0-255).
//
// | R | Name            | Role                          | Unit | Type    | Wr | Ind | Multi | Regex                                             |
// |---|-----------------|-------------------------------|------|---------|----|-----|-------|---------------------------------------------------|
// | * | RGB             | level.color.rgb               |      | string  | W  |     |       | `/^level\.color\.rgb$/`                           |
// |   | DIMMER          | level.dimmer                  | %    | number  | W  |     |       | `/^level\.dimmer$/`                               |
// |   | BRIGHTNESS      |                               | %    | number  | W  |     |       | `/^level\.brightness$/`                           |
// |   | TEMPERATURE     | level.color.temperature       | °K   | number  | W  |     |       | `/^level\.color\.temperature$/`                   |
// |   | ON              | switch.light                  |      | boolean | W  |     |       | `/^switch(\.light)?$/`                            |
// |   | ON_ACTUAL       | sensor.light                  |      | boolean | -  |     |       | `/^(state｜switch｜sensor)\.light｜switch$/`         |

export default class RgbSingle extends AdjustableControl {
    private readonly _brightnessCapability: BrightnessController | undefined;
    private readonly _brightness: Brightness | undefined;
    private readonly _colorTemperatureCapability: ColorTemperatureController | undefined;
    private readonly _powerControllerCapability: PowerController | undefined;
    private readonly _powerState: PowerState | undefined;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const map = this.statesMap;
        this._supported = [new Capabilities.ColorController(this.composeInitObjectColor())];

        if (this.states[map.temperature]) {
            this._colorTemperatureCapability = new Capabilities.ColorTemperatureController(
                this.composeInitObjectColorTemperature(),
            );
            this._supported.push(this._colorTemperatureCapability);
        }

        // if the state DIMMER or BRIGHTNESS configured
        if (this.states[map.dimmer] || this.states[map.brightness]) {
            this._brightnessCapability = new Capabilities.BrightnessController(this.composeInitObjectBrightness());
            this._brightness = this._brightnessCapability.brightness;
            this._supported.push(this._brightnessCapability);
        }

        // if the state ON, DIMMER or BRIGHTNESS configured
        if (this.states[map.on] || this._brightness) {
            this._powerControllerCapability = new Capabilities.PowerController(this.composeInitObjectPowerState());
            this._powerState = this._powerControllerCapability.powerState;
            this._supported.push(this._powerControllerCapability);
        }
    }

    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [ColorTemperatureInKelvin];
    }

    protected async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        const map = this.statesMap;

        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
            // convert the non-zero brightness to power = true
            if (property.propertyName === PowerState.propertyName && !this.states[map.on]) {
                property.currentValue = property.currentValue !== 0;
            }

            // For Color property, convert RGB hex string to HAL format
            if (property.propertyName === 'color') {
                const rgbValue = await AdapterProvider.getState(this.states[map.rgb]!.id);
                const halValue = rgb2hal(rgbwToHex(rgbValue as string));
                // @ts-expect-error HAL value is a special object format for color
                property.currentValue = halValue;
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
        const map = this.statesMap;

        if (property.propertyName === PowerState.propertyName) {
            if (this.states[map.on]) {
                await AdapterProvider.setState(property.setId, value);
                property.currentValue = value;
            } else {
                if (!this._brightness) {
                    throw new Error('No brightness property configured');
                }
                if (!this._powerState) {
                    throw new Error('No powerState property configured');
                }

                if (value) {
                    // set brightness
                    // set byOn to the configured value or range.max otherwise
                    const range = configuredRangeOrDefault(this.states[map.dimmer] || this.states[map.brightness]!);
                    const smartName = (this.states[map.dimmer] || this.states[map.brightness])?.smartName;
                    let byOn: number | string | undefined | null;
                    if (smartName && typeof smartName === 'object') {
                        byOn = smartName.byON;
                    } else {
                        byOn = undefined;
                    }
                    if (byOn === undefined || byOn === null || isNaN(byOn as unknown as number)) {
                        byOn = range.max as number | string | undefined | null;
                    } else {
                        byOn = parseFloat(byOn);
                    }
                    await AdapterProvider.setState(this._brightness.setId, byOn ?? 100);
                    this._brightness.currentValue = byOn;
                    this._powerState.currentValue = true;
                } else {
                    // set brightness to 0 on power OFF
                    await AdapterProvider.setState(this._brightness.setId, 0);
                    this._brightness.currentValue = 0;
                    this._powerState.currentValue = false;
                }
            }
        } else if (property.propertyName === 'color') {
            // For Color property, convert HAL format to RGB hex string
            if (typeof value === 'object' && value !== null) {
                const rgbHex = hal2rgb(value as { hue: number; saturation: number; brightness: number });
                await AdapterProvider.setState(this.states[map.rgb]!.id, rgbHex);
                property.currentValue = value;
            }
        } else if (
            property.propertyName === Brightness.propertyName ||
            property.propertyName === Color.propertyName ||
            property.propertyName === ColorTemperatureInKelvin.propertyName
        ) {
            await AdapterProvider.setState(property.setId, value);
            property.currentValue = value;
        }
    }

    async adjustValue(event: AlexaV3Request, property: PropertiesBase): Promise<AlexaV3DirectiveValue> {
        // extract Alexa delta value from event
        const delta = property.alexaDirectiveValue(event);

        // convert delta to iobroker value
        const value = property.value(delta);

        // set iobroker state
        await this.setState(property, value ?? 0);

        return value as AlexaV3DirectiveValue;
    }

    protected composeInitObjectColor(): {
        setState?: IotExternalDetectorState;
        getState?: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
        hal?: {
            hue: string;
            saturation?: string;
            brightness?: string;
        };
    } {
        const map = this.statesMap;
        // For RgbSingle, use the same RGB state for all hal components
        // The conversion between RGB and HAL formats happens in getOrRetrieveCurrentValue and setState
        return {
            hal: {
                hue: this.states[map.rgb]!.id,
                saturation: this.states[map.rgb]!.id,
                brightness: this.states[map.rgb]!.id,
            },
        };
    }

    protected composeInitObjectPowerState(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;
        return {
            setState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness]!,
            getState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? PowerState.ON : PowerState.OFF;
            },
        };
    }

    protected composeInitObjectBrightness(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;
        return {
            setState: this.states[map.dimmer] || this.states[map.brightness]!,
            getState: this.states[map.dimmer] || this.states[map.brightness]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return (
                    denormalize_0_100(
                        alexaValue as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    ) ?? 0
                );
            },
            alexaGetter: function (
                this: PropertiesBase,
                value: ioBroker.StateValue | undefined,
            ): AlexaV3DirectiveValue {
                return normalize_0_100(value as number, this.valuesRangeMin as number, this.valuesRangeMax as number);
            },
        };
    }

    protected composeInitObjectColorTemperature(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;
        return {
            setState: this.states[map.temperature]!,
            getState: this.states[map.temperature]!,
            alexaSetter: function (
                this: ColorTemperatureInKelvin,
                alexaValue: AlexaV3DirectiveValue,
            ): ioBroker.StateValue {
                if (alexaValue === 1) {
                    // increase directive
                    const closest = closestFromList(
                        (this.currentValue as number) || this.colorTemperatureTable[0],
                        this.colorTemperatureTable,
                    );
                    let index = this.colorTemperatureTable.indexOf(closest) + 1;
                    index = index >= this.colorTemperatureTable.length ? this.colorTemperatureTable.length - 1 : index;
                    return this.colorTemperatureTable[index];
                }
                if (alexaValue === -1) {
                    // decrease directive
                    const closest = closestFromList(
                        (this.currentValue as number) || this.colorTemperatureTable[0],
                        this.colorTemperatureTable,
                    );
                    let index = this.colorTemperatureTable.indexOf(closest) - 1;
                    index = index < 0 ? 0 : index;
                    return this.colorTemperatureTable[index];
                }

                return alexaValue as number;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value as number;
            },
        };
    }
}
