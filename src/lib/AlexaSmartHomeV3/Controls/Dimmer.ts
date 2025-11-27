import PowerController from '../Alexa/Capabilities/PowerController';
import BrightnessController from '../Alexa/Capabilities/BrightnessController';
import AdjustableControl from './AdjustableControl';
import { configuredRangeOrDefault, denormalize_0_100, normalize_0_100 } from '../Helpers/Utils';
import PowerState from '../Alexa/Properties/PowerState';
import Brightness from '../Alexa/Properties/Brightness';
import AdapterProvider from '../Helpers/AdapterProvider';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalPatternControl } from '../types';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Dimmer extends AdjustableControl {
    private readonly _powerControllerCapability: PowerController;
    private readonly _powerState: PowerState;
    private readonly _brightnessCapability: BrightnessController;
    private readonly _brightness: Brightness;
    private readonly _offValue: number;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        this._powerControllerCapability = new PowerController(this.composeInitObjectPowerState());
        this._powerState = this._powerControllerCapability.powerState;

        this._brightnessCapability = new BrightnessController(this.composeInitObjectBrightness());
        this._brightness = this._brightnessCapability.brightness;

        this._supported = [this._powerControllerCapability, this._brightnessCapability];

        const valuesRange = configuredRangeOrDefault(this.states[this.statesMap.set]!);
        this._offValue = denormalize_0_100(
            AdapterProvider.deviceOffLevel(),
            valuesRange.min as number,
            valuesRange.max as number,
        ) as number;

        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Brightness];
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue | undefined): Promise<void> {
        if (property.propertyName === PowerState.propertyName) {
            if (this.states[this.statesMap.on_set]) {
                await AdapterProvider.setState(property.setId, value ?? false);
                property.currentValue = value;
            } else {
                // this will be processed in Brightness property
            }
        } else {
            await AdapterProvider.setState(property.setId, value ?? 0);
            property.currentValue = value;
        }
    }

    async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert non-zero brightness to power = true
            if (property.propertyName === this._powerState.propertyName && property.getId === this._brightness.getId) {
                property.currentValue = (property.currentValue as number) > this._offValue;
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    private composeInitObjectPowerState(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.on_set] || this.states[map.set]!,
            getState: this.states[map.on_actual] || this.states[map.on_set] || this.states[map.set]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? PowerState.ON : PowerState.OFF;
            },
            multiPurposeProperty: !this.states[map.on_set], // Could handle brightness events
            handleSimilarEvents: true, // If brightness set to non-zero value and power is off, turn the lamp on
        };
    }

    private composeInitObjectBrightness(): ControlStateInitObject {
        /*
            Device of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100.

            If there is no 'ON_SET' state available:
            - switching control 'OFF' is done via setting its brightness to 0
            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brightness.
        */

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
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
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
            multiPurposeProperty: !this.states[map.on_set], // Could handle powerState events
            handleSimilarEvents: true, // If power set ON and brightness is 0, set to non-zero value
            offValue,
            onValue,
            percentage: true,
        };
    }
}
