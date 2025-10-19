import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    AlexaV3ThermostatMode,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import ThermostatController from '../Alexa/Capabilities/ThermostatController';
import PowerController from '../Alexa/Capabilities/PowerController';
import AdjustableControl from './AdjustableControl';
import { ensureValueInRange } from '../Helpers/Utils';
import TargetSetpoint from '../Alexa/Properties/TargetSetpoint';
import PowerState from '../Alexa/Properties/PowerState';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';

export default class Thermostat extends AdjustableControl {
    private readonly _temperatureSensor: TemperatureSensor | null = null;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const temperatureSensorConfig = this.composeInitObjectTemperature();
        this._supported = [
            new ThermostatController(this.composeInitObjectTargetSetpoint(), this.composeInitObjectThermostatMode()),
        ];
        if (temperatureSensorConfig) {
            this._temperatureSensor = new TemperatureSensor(temperatureSensorConfig);
            this._supported.push(this._temperatureSensor);
        }

        const map = this.statesMap;

        // if the state POWER is present, then we can switch it ON/OFF
        if (this.states[map.power]) {
            this._supported.push(new PowerController(this.composeInitObjectPowerState()));
        }
    }

    get categories(): AlexaV3Category[] {
        if (this._temperatureSensor) {
            return ['THERMOSTAT', 'TEMPERATURE_SENSOR'];
        }
        return ['THERMOSTAT'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [TargetSetpoint];
    }

    private composeInitObjectPowerState(): ControlStateInitObject {
        const map = this.statesMap;

        return {
            setState: this.states[map.power] || this.states[map.set]!,
            getState: this.states[map.power] || this.states[map.set]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value) {
                return value ? PowerState.ON : PowerState.OFF;
            },
        };
    }

    private composeInitObjectTemperature(): ControlStateInitObject | null {
        const map = this.statesMap;
        const detectorState = this.states[map.actual];
        if (!detectorState) {
            return null;
        }
        return {
            setState: detectorState,
            getState: detectorState,
        };
    }

    private composeInitObjectTargetSetpoint(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.set]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return ensureValueInRange(
                    alexaValue as number,
                    this.valuesRangeMin as number,
                    this.valuesRangeMax as number,
                );
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value as number;
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
}
