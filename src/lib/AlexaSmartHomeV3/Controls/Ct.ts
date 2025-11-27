import Capabilities from '../Alexa/Capabilities';
import { denormalize_0_100, normalize_0_100, closestFromList } from '../Helpers/Utils';
import AdapterProvider from '../Helpers/AdapterProvider';
import AdjustableControl from './AdjustableControl';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import type BrightnessController from '../Alexa/Capabilities/BrightnessController';
import Brightness from '../Alexa/Properties/Brightness';
import ColorTemperatureInKelvin from '../Alexa/Properties/ColorTemperatureInKelvin';
import PowerState from '../Alexa/Properties/PowerState';
import type { AlexaV3Category, AlexaV3DirectiveValue, AlexaV3Request, IotExternalPatternControl } from '../types';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Ct extends AdjustableControl {
    private readonly _brightnessCapability: BrightnessController | undefined;
    private readonly _brightness: Brightness | undefined;
    private readonly _offValue: number = 0;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const map = this.statesMap;
        this._supported = [new Capabilities.ColorTemperatureController(this.composeInitObjectColorTemperature())];

        // if the state DIMMER or BRIGHTNESS configured
        if (this.states[map.dimmer] || this.states[map.brightness]) {
            this._brightnessCapability = new Capabilities.BrightnessController(this.composeInitObjectBrightness());
            this._brightness = this._brightnessCapability.brightness;
            this._supported.push(this._brightnessCapability);
        }

        // if the state ON, DIMMER or BRIGHTNESS configured
        if (this.states[map.on] || this._brightness) {
            if (!this.states[map.on]) {
                const offValue = AdapterProvider.deviceOffLevel();
                this._offValue = denormalize_0_100(
                    offValue,
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
            if (this.states[map.on]) {
                await AdapterProvider.setState(property.setId, value);
                property.currentValue = value;
            } else {
                // this will be processed in Brightness property
            }
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

    protected composeInitObjectPowerState(): ControlStateInitObject {
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
        const isMireds =
            this.states[map.temperature]?.common?.unit === 'mired' ||
            this.states[map.temperature]?.common?.unit === 'mireds';

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
