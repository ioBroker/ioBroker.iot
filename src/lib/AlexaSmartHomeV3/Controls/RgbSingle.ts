import Capabilities from '../Alexa/Capabilities';
import { denormalize_0_100, normalize_0_100, closestFromList } from '../Helpers/Utils';
import AdapterProvider from '../Helpers/AdapterProvider';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import AdjustableControl from './AdjustableControl';
import type BrightnessController from '../Alexa/Capabilities/BrightnessController';
import type Brightness from '../Alexa/Properties/Brightness';
import ColorTemperatureInKelvin from '../Alexa/Properties/ColorTemperatureInKelvin';
import type ColorTemperatureController from '../Alexa/Capabilities/ColorTemperatureController';
import type PowerController from '../Alexa/Capabilities/PowerController';
import PowerState from '../Alexa/Properties/PowerState';
import type { AlexaV3Category, AlexaV3DirectiveValue, AlexaV3Request, IotExternalPatternControl } from '../types';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

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

        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
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
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
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

    protected composeInitObjectColor(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.rgb]!,
            getState: this.states[map.rgb]!,
            rgb: this.states[map.rgb]!,
        };
    }

    protected composeInitObjectPowerState(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.on_set] || this.states[map.dimmer] || this.states[map.brightness]!,
            getState:
                this.states[map.on_actual] ||
                this.states[map.on_set] ||
                this.states[map.dimmer] ||
                this.states[map.brightness]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? PowerState.ON : PowerState.OFF;
            },
            multiPurposeProperty: !this.states[map.on_set],
            handleSimilarEvents: true, // If brightness set to non-zero value and power is off, turn the lamp on
        };
    }

    protected composeInitObjectBrightness(): ControlStateInitObject {
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
            multiPurposeProperty: !this.states[map.on_set],
            handleSimilarEvents: true, // Set brightness to non-zero value if the lamp turned ON.
        };
    }

    protected composeInitObjectColorTemperature(): ControlStateInitObject {
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
