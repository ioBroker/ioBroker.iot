import PowerController from '../Alexa/Capabilities/PowerController';
import BrightnessController from '../Alexa/Capabilities/BrightnessController';
import AdjustableControl from './AdjustableControl';
import { configuredRangeOrDefault, denormalize_0_100, normalize_0_100 } from '../Helpers/Utils';
import PowerState from '../Alexa/Properties/PowerState';
import Brightness from '../Alexa/Properties/Brightness';
import AdapterProvider from '../Helpers/AdapterProvider';
import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';

export default class Dimmer extends AdjustableControl {
    private readonly _powerControllerCapability: PowerController;
    private readonly _powerState: PowerState;
    private readonly _brightnessCapability: BrightnessController;
    private readonly _brightness: Brightness;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        this._powerControllerCapability = new PowerController(this.composeInitObjectPowerState());
        this._powerState = this._powerControllerCapability.powerState;

        this._brightnessCapability = new BrightnessController(this.composeInitObjectBrightness());
        this._brightness = this._brightnessCapability.brightness;

        this._supported = [this._powerControllerCapability, this._brightnessCapability];
    }

    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Brightness];
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
        // set the property itself
        await AdapterProvider.setState(property.setId, value);
        property.currentValue = value;
        const valuesRange = configuredRangeOrDefault(this.states[this.statesMap.set]!);

        // todo: use adapter.config.deviceOffLevel
        // If

        if (property.propertyName === PowerState.propertyName) {
            // set brightness
            if (value) {
                const smartName = this.states[this.statesMap.set]!.smartName;
                let byOn: string | number | undefined | null;
                if (smartName && typeof smartName === 'object') {
                    byOn = smartName.byON;
                }
                // set byOn to the configured value or 100 otherwise
                byOn =
                    byOn === undefined || byOn === null || isNaN(byOn as number)
                        ? (valuesRange.max as number)
                        : parseFloat(byOn as string);
                await AdapterProvider.setState(this._brightness.setId, byOn);
                this._brightness.currentValue = byOn;
            } else {
                // set brightness to 0 on power OFF
                await AdapterProvider.setState(this._brightness.setId, valuesRange.min);
                this._brightness.currentValue = valuesRange.min;
            }
        } else {
            // set power
            const powerValue = value !== valuesRange.min;

            // only do this on different IDs for brightness and power
            if (this._brightness.setId !== this._powerState.setId) {
                await AdapterProvider.setState(this._powerState.setId, powerValue);
            }
            this._powerState.currentValue = powerValue;
        }
    }

    async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            const valuesRange = configuredRangeOrDefault(this.states[this.statesMap.set]!);
            // convert non-zero brightness to power = true
            if (property.propertyName === this._powerState.propertyName && property.getId === this._brightness.getId) {
                property.currentValue = property.currentValue !== valuesRange.min;
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    private composeInitObjectPowerState(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
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
        };
    }

    private composeInitObjectBrightness(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        /*
            Device of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100.

            If there is no 'ON_SET' state available:
            - switching control 'OFF' is done via setting its brightness to 0
            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brightness.
        */

        const map = this.statesMap;
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
        };
    }
}
