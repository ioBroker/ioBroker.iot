import ThermostatController from '../Alexa/Capabilities/ThermostatController';
import ThermostatMode from '../Alexa/Properties/ThermostatMode';
import PowerController from '../Alexa/Capabilities/PowerController';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import Temperature from '../Alexa/Properties/Temperature';
import PowerState from '../Alexa/Properties/PowerState';
import AdjustableControl from './AdjustableControl';
import { ensureValueInRange } from '../Helpers/Utils';
import TargetSetpoint from '../Alexa/Properties/TargetSetpoint';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import AdapterProvider from '../Helpers/AdapterProvider';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalDetectorState } from '../types';

export default class AirCondition extends AdjustableControl {
    private _thermostatController: ThermostatController | undefined;
    private _thermostatMode: ThermostatMode | undefined;
    private _powerController: PowerController | undefined;
    private _powerState: PowerState | undefined;
    private _lastKnownMode: number | string | undefined;

    get categories(): AlexaV3Category[] {
        return ['AIR_CONDITIONER'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [TargetSetpoint];
    }

    get dedicatedOnOff(): boolean {
        return this.states[this.statesMap.power] !== undefined;
    }

    initCapabilities(): CapabilitiesBase[] {
        this._thermostatController = new ThermostatController();
        this._thermostatMode = this._thermostatController.thermostatMode;
        this._powerController = new PowerController();
        this._powerState = this._powerController.powerState;
        const result: CapabilitiesBase[] = [new TemperatureSensor(), this._thermostatController, this._powerController];
        for (const property of result.flatMap(item => item.properties)) {
            const initObject = this.composeInitObject(property);
            if (initObject) {
                property.init(initObject);
            } else {
                throw new Error(`Unable to initialize property ${property.propertyName}`);
            }
        }
        return result;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue | undefined): Promise<void> {
        // if we set power ON/OFF via thermostat mode
        if (property.propertyName === PowerState.propertyName && !this.dedicatedOnOff) {
            // set the mode to the last known value or AUTO by switching power ON
            if (value) {
                this._lastKnownMode ||= this._thermostatMode!.supportedModesAsEnum[ThermostatMode.AUTO];
                await AdapterProvider.setState(this._thermostatMode!.setId, this._lastKnownMode);
                this._thermostatMode!.currentValue = this._lastKnownMode;
                this._powerState!.currentValue = true;
            } else {
                // set mode to OFF
                const modeOffValue = this._thermostatMode!.supportedModesAsEnum[ThermostatMode.OFF];
                await AdapterProvider.setState(this._thermostatMode!.setId, modeOffValue);
                this._thermostatMode!.currentValue = this._lastKnownMode;
                this._powerState!.currentValue = false;
            }
        } else {
            // just set the property
            await AdapterProvider.setState(property.setId, value!);
            property.currentValue = value;

            if (property.propertyName === ThermostatMode.propertyName) {
                this._lastKnownMode = value as string;
                if (!this.dedicatedOnOff) {
                    this._powerState!.currentValue =
                        value !== this._thermostatMode!.supportedModesAsEnum[ThermostatMode.OFF];
                }
            }
        }
    }

    async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert mode != OFF to power = true
            if (property.propertyName === this._powerState!.propertyName && !this.dedicatedOnOff) {
                property.currentValue =
                    property.currentValue !== this._thermostatMode!.supportedModesAsEnum[ThermostatMode.OFF];
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    composeInitObject(property: PropertiesBase):
        | {
              setState: IotExternalDetectorState;
              getState: IotExternalDetectorState;
              alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
              alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
              supportedModes?: string[];
          }
        | undefined {
        const map = this.statesMap;

        if (property.propertyName === PowerState.propertyName) {
            return {
                setState: this.states[map.power] || this.states[map.mode]!,
                getState: this.states[map.power] || this.states[map.mode]!,
                alexaSetter: function (alexaValue: AlexaV3DirectiveValue): boolean {
                    return alexaValue === PowerState.ON;
                },
                alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                    return value ? PowerState.ON : PowerState.OFF;
                },
            };
        }

        if (property.propertyName === Temperature.propertyName) {
            return {
                setState: this.states[map.set]!,
                getState: this.states[map.actual] || this.states[map.set]!,
            };
        }

        if (property.propertyName === TargetSetpoint.propertyName) {
            // const range = Utils.configuredRangeOrDefault(this.states[map.set]);
            return {
                setState: this.states[map.set]!,
                getState: this.states[map.actual] || this.states[map.set]!,
                alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                    return ensureValueInRange(
                        alexaValue as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    );
                },
                alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                    return value || 0;
                },
            };
        }

        if (property.propertyName === ThermostatMode.propertyName) {
            return {
                setState: this.states[map.mode]!,
                getState: this.states[map.mode]!,
                alexaSetter: function (
                    this: PropertiesBase,
                    alexaValue: AlexaV3DirectiveValue,
                ): ioBroker.StateValue | undefined {
                    return this.supportedModesAsEnum[alexaValue as string];
                },
                alexaGetter: function (
                    this: PropertiesBase,
                    value: ioBroker.StateValue | undefined,
                ): AlexaV3DirectiveValue {
                    return this.supportedModesAsEnum[value as string];
                },
                supportedModes: [
                    ThermostatMode.AUTO,
                    ThermostatMode.COOL,
                    ThermostatMode.ECO,
                    ThermostatMode.HEAT,
                    ThermostatMode.OFF,
                ],
            };
        }
    }
}
