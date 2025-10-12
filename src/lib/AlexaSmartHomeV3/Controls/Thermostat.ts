import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import ThermostatController from '../Alexa/Capabilities/ThermostatController';
import PowerController from '../Alexa/Capabilities/PowerController';
import AdjustableControl from './AdjustableControl';
import { ensureValueInRange } from '../Helpers/Utils';
import ThermostatMode from '../Alexa/Properties/ThermostatMode';
import TargetSetpoint from '../Alexa/Properties/TargetSetpoint';
import PowerState from '../Alexa/Properties/PowerState';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';

export default class Thermostat extends AdjustableControl {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        this._supported = [
            new TemperatureSensor(this.composeInitObjectTemperature()),
            new ThermostatController(this.composeInitObjectThermostatMode(), this.composeInitObjectTargetSetpoint()),
        ];
        const map = this.statesMap;

        // if the state POWER is present, then we can switch it ON/OFF
        if (this.states[map.power]) {
            this._supported.push(new PowerController(this.composeInitObjectPowerState()));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['THERMOSTAT', 'TEMPERATURE_SENSOR'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [TargetSetpoint];
    }

    private composeInitObjectPowerState(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
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

    private composeInitObjectTemperature(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual] || this.states[map.set]!,
        };
    }

    private composeInitObjectTargetSetpoint(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;
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
                return value as number;
            },
        };
    }

    private composeInitObjectThermostatMode(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
        supportedModes?: string[];
    } {
        const map = this.statesMap;
        return {
            setState: this.states[map.mode] || ({ id: undefined } as unknown as IotExternalDetectorState),
            getState: this.states[map.mode] || ({ id: undefined } as unknown as IotExternalDetectorState),
            alexaSetter: function (this: PropertiesBase, _alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return 0;
            },
            alexaGetter: function (_value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return ThermostatMode.AUTO;
            },
            supportedModes: [ThermostatMode.AUTO],
        };
    }
}
