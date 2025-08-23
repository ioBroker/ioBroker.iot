import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalDetectorState } from '../types';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import ThermostatController from '../Alexa/Capabilities/ThermostatController';
import PowerController from '../Alexa/Capabilities/PowerController';
import AdjustableControl from './AdjustableControl';
import { ensureValueInRange } from '../Helpers/Utils';
import ThermostatMode from '../Alexa/Properties/ThermostatMode';
import TargetSetpoint from '../Alexa/Properties/TargetSetpoint';
import Temperature from '../Alexa/Properties/Temperature';
import PowerState from '../Alexa/Properties/PowerState';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';

export default class Thermostat extends AdjustableControl {
    get categories(): AlexaV3Category[] {
        return ['THERMOSTAT', 'TEMPERATURE_SENSOR'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [TargetSetpoint];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new TemperatureSensor(), new ThermostatController()];
        const map = this.statesMap;
        // if the state POWER is present, then we can switch it ON/OFF
        if (this.states[map.power]) {
            result.push(new PowerController());
        }

        for (const property of result.flatMap(item => item.properties)) {
            const initObject = this.composeInitObject(property);
            if (initObject) {
                property.init(initObject);
            }
        }

        return result;
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

        if (property.propertyName === Temperature.propertyName) {
            return {
                setState: this.states[map.set]!,
                getState: this.states[map.actual] || this.states[map.set]!,
            };
        }

        if (property.propertyName === TargetSetpoint.propertyName) {
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

        if (property.propertyName === ThermostatMode.propertyName) {
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
}
