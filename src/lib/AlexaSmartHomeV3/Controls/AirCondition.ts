import ThermostatController from '../Alexa/Capabilities/ThermostatController';
import ThermostatMode from '../Alexa/Properties/ThermostatMode';
import PowerController from '../Alexa/Capabilities/PowerController';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import PowerState from '../Alexa/Properties/PowerState';
import AdjustableControl from './AdjustableControl';
import { ensureValueInRange } from '../Helpers/Utils';
import TargetSetpoint from '../Alexa/Properties/TargetSetpoint';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import AdapterProvider from '../Helpers/AdapterProvider';
import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    AlexaV3ThermostatMode,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';
import Connectivity from '../Alexa/Properties/Connectivity';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class AirCondition extends AdjustableControl {
    private readonly _thermostatController: ThermostatController;
    private readonly _thermostatMode: ThermostatMode;
    private readonly _powerController: PowerController;
    private readonly _powerState: PowerState;
    private _lastKnownMode: number | string | undefined;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        this._thermostatController = new ThermostatController(
            this.composeInitObjectTargetSetpoint(),
            this.composeInitObjectThermostatMode(),
        );
        this._thermostatMode = this._thermostatController.thermostatMode;
        this._powerController = new PowerController(this.composeInitObjectPowerState());
        this._powerState = this._powerController.powerState;

        this._supported = [
            new TemperatureSensor(this.composeInitObjectTemperature()),
            this._thermostatController,
            this._powerController,
        ];
        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['AIR_CONDITIONER'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [TargetSetpoint];
    }

    get dedicatedOnOff(): boolean {
        return this.states[this.statesMap.power] !== undefined;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue | undefined): Promise<void> {
        // if we set power ON/OFF via thermostat mode
        if (property.propertyName === PowerState.propertyName && !this.dedicatedOnOff) {
            // set the mode to the last known value or AUTO by switching power ON
            if (value) {
                this._lastKnownMode ||= this._thermostatMode.supportedModesAsEnum[ThermostatMode.AUTO];
                await AdapterProvider.setState(this._thermostatMode.setId, this._lastKnownMode);
                this._thermostatMode.currentValue = this._lastKnownMode;
                this._powerState.currentValue = true;
            } else {
                // set mode to OFF
                const modeOffValue = this._thermostatMode.supportedModesAsEnum[ThermostatMode.OFF];
                await AdapterProvider.setState(this._thermostatMode.setId, modeOffValue);
                this._thermostatMode.currentValue = this._lastKnownMode;
                this._powerState.currentValue = false;
            }
        } else {
            // just set the property
            await AdapterProvider.setState(property.setId, value!);
            property.currentValue = value;

            if (property.propertyName === ThermostatMode.propertyName) {
                this._lastKnownMode = value as string;
                if (!this.dedicatedOnOff) {
                    this._powerState.currentValue = this._thermostatMode.alexaValue(value) !== ThermostatMode.OFF;
                }
            }
        }
    }

    async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert mode != OFF to power = true
            if (property.propertyName === this._powerState.propertyName && !this.dedicatedOnOff) {
                property.currentValue =
                    property.currentValue !== this._thermostatMode.supportedModesAsEnum[ThermostatMode.OFF];
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

    private composeInitObjectThermostatMode(): ControlStateInitObject {
        const map = this.statesMap;
        // extract all modes
        const modes = this.states[map.mode];
        let states = modes?.common?.states || {};
        const supportedModes: AlexaV3ThermostatMode[] = [];
        if (states) {
            if (Array.isArray(states)) {
                const _states: { [modeValue: string]: string } = {};
                states.forEach(state => {
                    _states[state] = state.toUpperCase();
                });
                states = _states;
            }
            // Try map to known modes 'AUTO' | 'COOL' | 'HEAT' | 'OFF' | 'ECO' | 'EM_HEAT'
            Object.keys(states).forEach(state => {
                const mode = states[state].toUpperCase();
                if (mode.includes('AUTO')) {
                    supportedModes[parseInt(state, 10)] = 'AUTO';
                    states[state] = 'AUTO';
                } else if (mode.includes('COOL')) {
                    supportedModes[parseInt(state, 10)] = 'COOL';
                    states[state] = 'COOL';
                } else if (mode.includes('HEAT')) {
                    supportedModes[parseInt(state, 10)] = 'HEAT';
                    states[state] = 'HEAT';
                } else if (mode.includes('ECO')) {
                    supportedModes[parseInt(state, 10)] = 'ECO';
                    states[state] = 'ECO';
                } else if (mode.includes('OFF')) {
                    supportedModes[parseInt(state, 10)] = 'OFF';
                    states[state] = 'OFF';
                } else {
                    states[state] = mode;
                }
            });
        }
        if (!supportedModes.length) {
            supportedModes.push('AUTO');
        }

        return {
            setState: this.states[map.mode] || ({ id: undefined } as unknown as IotExternalDetectorState),
            getState: this.states[map.mode] || ({ id: undefined } as unknown as IotExternalDetectorState),
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                // Convert 'AUTO' and so on into 0, 1
                const pos = Object.keys(states).indexOf(alexaValue as AlexaV3ThermostatMode);
                if (pos !== -1) {
                    return Object.keys(states)[pos];
                }
                return 0;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return (value !== undefined && states[value as number] !== undefined) || 'AUTO';
            },
            supportedModes: supportedModes,
        };
    }

    private composeInitObjectTargetSetpoint(): ControlStateInitObject {
        const map = this.statesMap;
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

    private composeInitObjectTemperature(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual] || this.states[map.set]!,
        };
    }
}
