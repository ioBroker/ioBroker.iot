import Capabilities from '../Alexa/Capabilities';
import type BrightnessController from '../Alexa/Capabilities/BrightnessController';
import type ColorTemperatureController from '../Alexa/Capabilities/ColorTemperatureController';
import {
    denormalize_0_100,
    normalize_0_100,
    closestFromList,
    rgb2hal,
    normalize_0_1,
    denormalize_0_1,
} from '../Helpers/Utils';
import Properties from '../Alexa/Properties';
import PowerState from '../Alexa/Properties/PowerState';
import Brightness from '../Alexa/Properties/Brightness';
import AdapterProvider from '../Helpers/AdapterProvider';
import AdjustableControl from './AdjustableControl';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import type { AlexaV3Category, AlexaV3DirectiveValue, AlexaV3Request, IotExternalPatternControl } from '../types';
import Color from '../Alexa/Properties/Color';
import ColorTemperatureInKelvin from '../Alexa/Properties/ColorTemperatureInKelvin';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Hue extends AdjustableControl {
    private readonly _brightnessCapability: BrightnessController | undefined;
    private readonly _brightness: Brightness | undefined;
    private readonly _colorTemperatureCapability: ColorTemperatureController | undefined;
    private readonly _offValue: number = 0;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const map = this.statesMap;
        this._supported = [new Capabilities.ColorController(this.composeInitObjectColor())];

        // if the state DIMMER or BRIGHTNESS configured
        if (this.states[map.dimmer] || this.states[map.brightness]) {
            this._brightnessCapability = new Capabilities.BrightnessController(this.composeInitObjectBrightness());
            this._brightness = this._brightnessCapability.brightness;
            this._supported.push(this._brightnessCapability);
        }

        // if the state TEMPERATURE configured
        if (this.states[map.temperature]) {
            this._colorTemperatureCapability = new Capabilities.ColorTemperatureController(
                this.composeInitObjectColorTemperature(),
            );
            this._supported.push(this._colorTemperatureCapability);
        }

        // if the state ON, DIMMER or BRIGHTNESS configured
        if (this.states[map.on] || this._brightness) {
            if (!this.states[map.on]) {
                this._offValue = denormalize_0_1(
                    AdapterProvider.deviceOffLevel(),
                    this._brightness!.valuesRangeMin as number,
                    (this._brightness!.valuesRangeMax as number) || 100,
                ) as number;
            }
            this._supported.push(new Capabilities.PowerController(this.composeInitObjectPowerState()));
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
        return [Properties.ColorTemperatureInKelvin];
    }

    async getOrRetrieveCurrentValue(property: Color): Promise<ioBroker.StateValue> {
        const map = this.statesMap;

        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
            // convert the non-zero brightness to power = true
            if (property.propertyName === Properties.PowerState.propertyName && !this.states[map.on]) {
                property.currentValue = (property.currentValue as number) > this._offValue;
            }

            if (property.propertyName === Properties.Color.propertyName) {
                let saturation = property.hal!.saturation
                    ? await AdapterProvider.getState(property.hal!.saturation)
                    : 100;
                let brightness = property.hal!.brightness
                    ? await AdapterProvider.getState(property.hal!.brightness)
                    : 100;
                // convert to HAL object
                if (this._brightness) {
                    brightness = normalize_0_1(
                        brightness as number,
                        this._brightness.valuesRangeMin as number,
                        this._brightness.valuesRangeMax as number,
                    ) as number;
                }
                if (this.states[map.saturation]) {
                    saturation = normalize_0_1(
                        saturation as number,
                        this.states[map.saturation]!.common.min || 0,
                        this.states[map.saturation]!.common.max || 100,
                    ) as number;
                }

                // @ts-expect-error special case for Hue property
                property.currentValue = {
                    hue: property.currentValue,
                    saturation,
                    brightness,
                };
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue | undefined): Promise<void> {
        if (property.propertyName === PowerState.propertyName) {
            if (this.states[this.statesMap.on]) {
                await AdapterProvider.setState(property.setId, value ?? false);
                property.currentValue = value;
            } else {
                // this will be processed in Brightness property
            }
        } else if (property.propertyName === Brightness.propertyName) {
            await AdapterProvider.setState(property.setId, value ?? 0);
            property.currentValue = value;
        } else if (property.propertyName === Color.propertyName) {
            const colorProperty = property as Color;
            const hueValue = rgb2hal(value as string);
            await AdapterProvider.setState(colorProperty.hal!.hue, hueValue.hue);
            const map = this.statesMap;
            if (colorProperty.hal!.saturation) {
                // The saturation is from 0 to 1 in Alexa, but from 0 to 100 in ioBroker
                const iobValue = denormalize_0_1(
                    hueValue.saturation,
                    this.states[map.saturation]!.common.min || 0,
                    this.states[map.saturation]!.common.max || 100,
                ) as number;

                await AdapterProvider.setState(colorProperty.hal!.saturation, iobValue);
            }
            // do not set brightness
            // if (colorProperty.hal!.brightness) {
            //     // The brightness is from 0 to 1 in Alexa, but from 0 to 100 in ioBroker
            //     const iobValue = denormalize_0_1(
            //         hueValue.brightness,
            //         this.states[map.brightness]!.common.min || 0,
            //         this.states[map.brightness]!.common.max || 100,
            //     ) as number;
            //     await AdapterProvider.setState(colorProperty.hal!.brightness, iobValue);
            // }

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

    private composeInitObjectPowerState(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness]!,
            getState:
                this.states[map.on_actual] ||
                this.states[map.on] ||
                this.states[map.dimmer] ||
                this.states[map.brightness]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (
                this: PropertiesBase,
                value: ioBroker.StateValue | undefined,
            ): AlexaV3DirectiveValue {
                return value ? PowerState.ON : PowerState.OFF;
            },
            multiPurposeProperty: !this.states[map.on], // Could handle brightness events
            handleSimilarEvents: true, // If brightness set to non-zero value and power is off, turn the lamp on
        };
    }

    private composeInitObjectBrightness(): ControlStateInitObject {
        const map = this.statesMap;
        let onValue: number | 'stored' | 'omit' | undefined = undefined;
        const offValue = AdapterProvider.deviceOffLevel();
        if (this.smartName && typeof this.smartName === 'object') {
            const byOn = this.smartName.byON;
            if (byOn !== null && byOn !== undefined && !isNaN(byOn as unknown as number)) {
                onValue = parseFloat(byOn as any);
                if (onValue < offValue) {
                    onValue = offValue;
                }
            } else if (byOn === 'stored' || byOn === 'omit') {
                onValue = byOn;
            }
        }

        return {
            setState: this.states[map.dimmer] || this.states[map.brightness]!,
            getState: this.states[map.dimmer] || this.states[map.brightness]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                const ioBrokerValue =
                    denormalize_0_100(
                        alexaValue as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    ) ?? 0;
                console.log('Alexa Setter Brightness:', alexaValue, '->', ioBrokerValue);
                return ioBrokerValue;
            },
            alexaGetter: function (
                this: PropertiesBase,
                value: ioBroker.StateValue | undefined,
            ): AlexaV3DirectiveValue {
                const alexaValue = normalize_0_100(
                    value as number,
                    this.valuesRangeMin as number,
                    this.valuesRangeMax as number,
                );
                console.log('Alexa Getter Brightness:', value, '->', alexaValue);
                return alexaValue;
            },
            multiPurposeProperty: !this.states[map.on], // Could handle powerState events
            handleSimilarEvents: true, // If power set ON and brightness is 0, set to non-zero value
            offValue,
            onValue,
        };
    }

    private composeInitObjectColor(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            hal: {
                hue: this.states[map.hue]!,
                saturation: this.states[map.saturation],
                brightness: this.states[map.dimmer] || this.states[map.brightness],
            },
        };
    }

    private composeInitObjectColorTemperature(): ControlStateInitObject {
        const map = this.statesMap;
        const isMireds = this.states[map.temperature]?.common?.unit === 'mireds';

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
                // Convert Kelvin to mireds
                if (isMireds) {
                    return Math.round(1000000 / (alexaValue as number));
                }
                return alexaValue as number;
            },
            alexaGetter: function (
                this: PropertiesBase,
                value: ioBroker.StateValue | undefined,
            ): AlexaV3DirectiveValue {
                // Convert Mireds to Kelvin
                if (isMireds) {
                    return Math.round(1000000 / (value as number));
                }
                return value as number;
            },
        };
    }
}
