import Capabilities from '../Alexa/Capabilities';
import type PowerController from '../Alexa/Capabilities/PowerController';
import type BrightnessController from '../Alexa/Capabilities/BrightnessController';
import type ColorTemperatureController from '../Alexa/Capabilities/ColorTemperatureController';
import { configuredRangeOrDefault, denormalize_0_100, normalize_0_100, closestFromList } from '../Helpers/Utils';
import Properties from '../Alexa/Properties';
import PowerState from '../Alexa/Properties/PowerState';
import Brightness from '../Alexa/Properties/Brightness';
import AdapterProvider from '../Helpers/AdapterProvider';
import AdjustableControl from './AdjustableControl';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import type { AlexaV3Category, AlexaV3DirectiveValue, AlexaV3Request } from '../types';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import Color from '../Alexa/Properties/Color';
import ColorTemperatureInKelvin from '../Alexa/Properties/ColorTemperatureInKelvin';

export default class Hue extends AdjustableControl {
    private _powerControllerCapability!: PowerController;
    private _powerState!: PowerState;
    private _brightnessCapability!: BrightnessController;
    private _brightness!: Brightness;
    private _colorTemperatureCapability!: ColorTemperatureController;

    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Properties.ColorTemperatureInKelvin];
    }

    initCapabilities(): CapabilitiesBase[] {
        const map = this.statesMap;
        const result = [new Capabilities.ColorController()];

        // if the state DIMMER or BRIGHTNESS configured
        if (this.states[map.dimmer] || this.states[map.brightness]) {
            this._brightnessCapability = new Capabilities.BrightnessController();
            this._brightness = this._brightnessCapability.brightness;
            result.push(this._brightnessCapability);
        }

        // if the state TEMPERATURE configured
        if (this.states[map.temperature]) {
            this._colorTemperatureCapability = new Capabilities.ColorTemperatureController();
            result.push(this._colorTemperatureCapability);
        }

        // if the state ON, DIMMER or BRIGHTNESS configured
        if (this.states[map.on] || this._brightness) {
            this._powerControllerCapability = new Capabilities.PowerController();
            this._powerState = this._powerControllerCapability.powerState;
            result.push(this._powerControllerCapability);
        }

        for (const property of result.flatMap(item => item.properties)) {
            const initObj = this.composeInitObject(property);
            if (initObj) {
                property.init(initObj);
            }
        }

        return result;
    }

    async getOrRetrieveCurrentValue(property: Color): Promise<ioBroker.StateValue> {
        const map = this.statesMap;

        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
            // convert the non-zero brightness to power = true
            if (property.propertyName === Properties.PowerState.propertyName && !this.states[map.on]) {
                property.currentValue = property.currentValue !== 0;
            }

            if (property.propertyName === Properties.Color.propertyName) {
                // @ts-expect-error special case for Color property
                property.currentValue = {
                    hue: property.currentValue,
                    saturation: property.hal.saturation,
                    brightness: property.hal.brightness,
                };
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue | undefined): Promise<void> {
        const map = this.statesMap;

        if (property.propertyName === PowerState.propertyName) {
            if (this.states[map.on]) {
                await AdapterProvider.setState(property.setId, value ?? false);
                property.currentValue = value;
            } else {
                if (value) {
                    // set brightness
                    // set byOn to the configured value or range.max otherwise
                    const range = configuredRangeOrDefault(this.states[map.dimmer] || this.states[map.brightness]!);
                    const smartName = (this.states[map.dimmer] || this.states[map.brightness])?.smartName;
                    let byOn: string | number | undefined | null;
                    if (smartName && typeof smartName === 'object') {
                        byOn = smartName.byON;
                    }
                    byOn =
                        byOn === null || byOn === undefined || isNaN(byOn as number)
                            ? (range.max as number)
                            : parseFloat(byOn as string);
                    await AdapterProvider.setState(this._brightness.setId, byOn);
                    this._brightness.currentValue = byOn;
                    this._powerState.currentValue = true;
                } else {
                    // set brightness to 0 on power OFF
                    await AdapterProvider.setState(this._brightness.setId, 0);
                    this._brightness.currentValue = 0;
                    this._powerState.currentValue = false;
                }
            }
        } else if (property.propertyName === Brightness.propertyName) {
            await AdapterProvider.setState(property.setId, value ?? 0);
            property.currentValue = value;
        } else if (property.propertyName === Color.propertyName) {
            const colorProperty = property as Color;
            const hueValue = value as unknown as { hue: number; saturation: number };
            await AdapterProvider.setState(colorProperty.hal.hue, hueValue.hue);
            if (colorProperty.hal.saturation) {
                await AdapterProvider.setState(colorProperty.hal.saturation, hueValue.saturation);
            }

            // do not set brightness

            // https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-colorcontroller.html
            // Important: For the best user experience, when you make a color change, maintain the current brightness setting of the endpoint.
            // For example, if a light bulb is currently set to white at 0.5 brightness, and a user requests a color change to red,
            // the SetColor directive specifies hue = 0, saturation = 1, and brightness = 1. Here, set the hue to 0, the saturation to 1,
            // and ignore the brightness value of 1 in the directive. Instead, maintain the current brightness value of 0.5.

            property.currentValue = value;
        } else if (property.propertyName === ColorTemperatureInKelvin.propertyName) {
            await AdapterProvider.setState(property.setId, value ?? 2200);
            property.currentValue = value;
        }
    }

    async adjustValue(event: AlexaV3Request, property: PropertiesBase): Promise<AlexaV3DirectiveValue> {
        // extract Alexa delta value from event
        const delta = property.alexaDirectiveValue(event);

        // convert delta to iobroker value
        const value = property.value(delta);

        // set iobroker state
        await this.setState(property, value);

        return value as AlexaV3DirectiveValue;
    }

    composeInitObject(property: PropertiesBase): ControlStateInitObject | undefined {
        const map = this.statesMap;

        if (property.propertyName === Properties.PowerState.propertyName) {
            return {
                setState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness]!,
                getState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness]!,
                alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                    return alexaValue === PowerState.ON;
                },
                alexaGetter: function (
                    this: PropertiesBase,
                    value: ioBroker.StateValue | undefined,
                ): AlexaV3DirectiveValue {
                    return value ? PowerState.ON : PowerState.OFF;
                },
            };
        }

        if (property.propertyName === Brightness.propertyName) {
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
                    return normalize_0_100(
                        value as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    );
                },
            };
        }

        if (property.propertyName === Properties.Color.propertyName) {
            return {
                hal: {
                    hue: this.states[map.hue]!.id,
                    saturation: this.states[map.saturation]?.id,
                    brightness: (this.states[map.dimmer] || this.states[map.brightness])?.id,
                },
            };
        }

        if (property.propertyName === Properties.ColorTemperatureInKelvin.propertyName) {
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
                        index =
                            index >= this.colorTemperatureTable.length ? this.colorTemperatureTable.length - 1 : index;
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
                alexaGetter: function (
                    this: PropertiesBase,
                    value: ioBroker.StateValue | undefined,
                ): AlexaV3DirectiveValue {
                    return value as number;
                },
            };
        }
    }
}
