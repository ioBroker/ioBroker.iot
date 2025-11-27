import Capabilities from '../Alexa/Capabilities';
import { configuredRangeOrDefault, denormalize_0_100, normalize_0_100, closestFromList } from '../Helpers/Utils';
import AdapterProvider from '../Helpers/AdapterProvider';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import AdjustableControl from './AdjustableControl';
import type BrightnessController from '../Alexa/Capabilities/BrightnessController';
import Brightness from '../Alexa/Properties/Brightness';
import ColorTemperatureInKelvin from '../Alexa/Properties/ColorTemperatureInKelvin';
import type ColorTemperatureController from '../Alexa/Capabilities/ColorTemperatureController';
import PowerState from '../Alexa/Properties/PowerState';
import type { AlexaV3Category, AlexaV3DirectiveValue, AlexaV3Request, IotExternalPatternControl } from '../types';
import Color from '../Alexa/Properties/Color';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

// ### RGB(W) Light with different states for every color [rgb]
//
// R,G,B(,W) Light with different states for every color. The value is from 0 to 255.
//
// | R | Name            | Role                          | Unit | Type    | Wr | Ind | Multi | Regex                                             |
// |---|-----------------|-------------------------------|------|---------|----|-----|-------|---------------------------------------------------|
// | * | RED             | level.color.red               |      | number  | W  |     |       | `/^level\.color\.red$/`                           |
// | * | GREEN           | level.color.green             |      | number  | W  |     |       | `/^level\.color\.green$/`                         |
// | * | BLUE            | level.color.blue              |      | number  | W  |     |       | `/^level\.color\.blue$/`                          |
// |   | WHITE           | level.color.white             |      | number  | W  |     |       | `/^level\.color\.white$/`                         |
// |   | DIMMER          | level.dimmer                  | %    | number  | W  |     |       | `/^level\.dimmer$/`                               |
// |   | BRIGHTNESS      |                               |      | number  | W  |     |       | `/^level\.brightness$/`                           |
// |   | TEMPERATURE     | level.color.temperature       | °K   | number  | W  |     |       | `/^level\.color\.temperature$/`                   |
// |   | ON              | switch.light                  |      | boolean | W  |     |       | `/^switch(\.light)?$｜^state$/`                    |
// |   | ON_ACTUAL       | sensor.light                  |      | boolean | -  |     |       | `/^(state｜switch｜sensor)\.light｜switch$/`         |

export default class Rgb extends AdjustableControl {
    private readonly _brightnessCapability: BrightnessController | undefined;
    private readonly _brightness: Brightness | undefined;
    private readonly _colorTemperatureCapability: ColorTemperatureController | undefined;
    private readonly _offValue: number = 0;

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
            if (!this.states[map.on]) {
                this._offValue = denormalize_0_100(
                    AdapterProvider.deviceOffLevel(),
                    this._brightness!.valuesRangeMin as number,
                    (this._brightness!.valuesRangeMin as number) || 100,
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
        return [ColorTemperatureInKelvin];
    }

    protected async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        const map = this.statesMap;

        if (property.propertyName === Color.propertyName) {
            // read every time all colors
            const red = await AdapterProvider.getState(this.states[map.red]!.id);
            const green = await AdapterProvider.getState(this.states[map.green]!.id);
            const blue = await AdapterProvider.getState(this.states[map.blue]!.id);
            let white: ioBroker.StateValue | undefined;
            if (this.states[map.white]) {
                white = await AdapterProvider.getState(this.states[map.white]!.id);
            }
            const minMaxRed = configuredRangeOrDefault(this.states[map.red]!);
            const minMaxGreen = configuredRangeOrDefault(this.states[map.green]!);
            const minMaxBlue = configuredRangeOrDefault(this.states[map.blue]!);
            let minMaxWhite: { min: number | boolean; max: number | boolean } | undefined;
            if (this.states[map.white]) {
                minMaxWhite = configuredRangeOrDefault(this.states[map.white]!);
            }
            // normalize values to 0-255
            const redNorm = normalize_0_100(red as number, minMaxRed.min as number, minMaxRed.max as number, true);
            const greenNorm = normalize_0_100(
                green as number,
                minMaxGreen.min as number,
                minMaxGreen.max as number,
                true,
            );
            const blueNorm = normalize_0_100(blue as number, minMaxBlue.min as number, minMaxBlue.max as number, true);
            let whiteNorm: number | undefined;
            if (this.states[map.white]) {
                whiteNorm = normalize_0_100(
                    white as number,
                    minMaxWhite!.min as number,
                    minMaxWhite!.max as number,
                    true,
                );
            }
            const red255 = Math.round((redNorm as number) * 2.55);
            const green255 = Math.round((greenNorm as number) * 2.55);
            const blue255 = Math.round((blueNorm as number) * 2.55);
            let white255: number | undefined;
            if (this.states[map.white]) {
                white255 = Math.round((whiteNorm as number) * 2.55);
            }

            // Convert to HEX
            let hex = `#${red255.toString(16).padStart(2, '0')}${green255.toString(16).padStart(2, '0')}${blue255.toString(16).padStart(2, '0')}`;

            if (this.states[map.white]) {
                hex += white255!.toString(16).padStart(2, '0');
            }

            // store current value
            property.currentValue = hex.toLowerCase();
            return property.currentValue;
        }

        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
            // convert the non-zero brightness to power = true
            if (property.propertyName === PowerState.propertyName && !this.states[map.on]) {
                property.currentValue = (property.currentValue as number) > this._offValue;
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
            if (this.states[this.statesMap.on]) {
                await AdapterProvider.setState(property.setId, value ?? false);
                property.currentValue = value;
            } else {
                // this will be processed in Brightness property
            }
        } else if (property.propertyName === Color.propertyName) {
            // Split value into RGB(W)
            const hex = (value as string).replace('#', '');
            const red = parseInt(hex.substring(0, 2), 16);
            const green = parseInt(hex.substring(2, 4), 16);
            const blue = parseInt(hex.substring(4, 6), 16);
            // let white: number | undefined;
            // if (hex.length === 8) {
            //     white = parseInt(hex.substring(6, 8), 16);
            // }

            // Convert from 0-255 to 0-100
            const red100 = (red / 255) * 100;
            const green100 = (green / 255) * 100;
            const blue100 = (blue / 255) * 100;
            // let white100: number | undefined;
            // if (white !== undefined) {
            //     white100 = (white / 255) * 100;
            // }

            // Convert from 0-100 to min-max of the state
            const minMaxRed = configuredRangeOrDefault(this.states[map.red]!);
            const minMaxGreen = configuredRangeOrDefault(this.states[map.green]!);
            const minMaxBlue = configuredRangeOrDefault(this.states[map.blue]!);
            // let minMaxWhite: { min: number | boolean; max: number | boolean } | undefined;
            // if (this.states[map.white]) {
            //     minMaxWhite = configuredRangeOrDefault(this.states[map.white]!);
            // }

            const redValue = denormalize_0_100(red100, minMaxRed.min as number, minMaxRed.max as number);
            const greenValue = denormalize_0_100(green100, minMaxGreen.min as number, minMaxGreen.max as number);
            const blueValue = denormalize_0_100(blue100, minMaxBlue.min as number, minMaxBlue.max as number);
            // let whiteValue: number | undefined;
            // if (this.states[map.white]) {
            //     whiteValue = denormalize_0_100(white100!, minMaxWhite!.min as number, minMaxWhite!.max as number);
            // }

            // set states
            await Promise.all([
                AdapterProvider.setState(this.states[map.red]!.id, redValue ?? 0),
                AdapterProvider.setState(this.states[map.green]!.id, greenValue ?? 0),
                AdapterProvider.setState(this.states[map.blue]!.id, blueValue ?? 0),
                // this.states[map.white] ? AdapterProvider.setState(this.states[map.white]!.id, whiteValue ?? 0) : null,
            ]);

            property.currentValue = value;
        } else if (
            property.propertyName === Brightness.propertyName ||
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

    protected composeInitObjectColor(): ControlStateInitObject {
        const map = this.statesMap;

        // Set default min max to 0 255 for colors
        ['red', 'green', 'blue', 'white'].forEach(color => {
            if (this.states[map[color]] && this.states[map[color]]!.common?.min === undefined) {
                this.states[map[color]]!.common ||= {};
                this.states[map[color]]!.common.min = 0;
            }
            if (this.states[map[color]] && this.states[map[color]]!.common?.max === undefined) {
                this.states[map[color]]!.common ||= {};
                this.states[map[color]]!.common.max = 255;
            }
        });

        if (this.states[map.white]) {
            return {
                rgbw: {
                    red: this.states[map.red]!,
                    green: this.states[map.green]!,
                    blue: this.states[map.blue]!,
                    white: this.states[map.white]!,
                },
            };
        }
        return {
            rgb: {
                red: this.states[map.red]!,
                green: this.states[map.green]!,
                blue: this.states[map.blue]!,
            },
        };
    }

    protected composeInitObjectPowerState(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness]!,
            getState:
                this.states[map.on] ||
                this.states[map.on_actual] ||
                this.states[map.dimmer] ||
                this.states[map.brightness]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? PowerState.ON : PowerState.OFF;
            },
            multiPurposeProperty: !this.states[map.on], // Could handle brightness events
            handleSimilarEvents: true, // If brightness set to non-zero value and power is off, turn the lamp on
        };
    }

    protected composeInitObjectBrightness(): ControlStateInitObject {
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
            multiPurposeProperty: !this.states[map.on], // Could handle powerState events
            handleSimilarEvents: true, // If power set ON and brightness is 0, set to non-zero value
            offValue,
            onValue,
            percentage: true,
        };
    }

    protected composeInitObjectColorTemperature(): ControlStateInitObject {
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
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                // Convert Mireds to Kelvin
                if (isMireds) {
                    return Math.round(1000000 / (value as number));
                }
                return value as number;
            },
        };
    }
}
