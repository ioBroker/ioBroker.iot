"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TemperatureSensor_1 = __importDefault(require("../Alexa/Capabilities/TemperatureSensor"));
const ThermostatController_1 = __importDefault(require("../Alexa/Capabilities/ThermostatController"));
const PowerController_1 = __importDefault(require("../Alexa/Capabilities/PowerController"));
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
const Utils_1 = require("../Helpers/Utils");
const ThermostatMode_1 = __importDefault(require("../Alexa/Properties/ThermostatMode"));
const TargetSetpoint_1 = __importDefault(require("../Alexa/Properties/TargetSetpoint"));
const Temperature_1 = __importDefault(require("../Alexa/Properties/Temperature"));
const PowerState_1 = __importDefault(require("../Alexa/Properties/PowerState"));
class Thermostat extends AdjustableControl_1.default {
    get categories() {
        return ['THERMOSTAT', 'TEMPERATURE_SENSOR'];
    }
    adjustableProperties() {
        return [TargetSetpoint_1.default];
    }
    initCapabilities() {
        const result = [new TemperatureSensor_1.default(), new ThermostatController_1.default()];
        const map = this.statesMap;
        // if the state POWER is present, then we can switch it ON/OFF
        if (this.states[map.power]) {
            result.push(new PowerController_1.default());
        }
        for (const property of result.flatMap(item => item.properties)) {
            const initObject = this.composeInitObject(property);
            if (initObject) {
                property.init(initObject);
            }
        }
        return result;
    }
    composeInitObject(property) {
        const map = this.statesMap;
        if (property.propertyName === PowerState_1.default.propertyName) {
            return {
                setState: this.states[map.power] || this.states[map.set],
                getState: this.states[map.power] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return alexaValue === PowerState_1.default.ON;
                },
                alexaGetter: function (value) {
                    return value ? PowerState_1.default.ON : PowerState_1.default.OFF;
                },
            };
        }
        if (property.propertyName === Temperature_1.default.propertyName) {
            return {
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
            };
        }
        if (property.propertyName === TargetSetpoint_1.default.propertyName) {
            return {
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return (0, Utils_1.ensureValueInRange)(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return value;
                },
            };
        }
        if (property.propertyName === ThermostatMode_1.default.propertyName) {
            return {
                setState: this.states[map.mode] || { id: undefined },
                getState: this.states[map.mode] || { id: undefined },
                alexaSetter: function (_alexaValue) {
                    return 0;
                },
                alexaGetter: function (_value) {
                    return ThermostatMode_1.default.AUTO;
                },
                supportedModes: [ThermostatMode_1.default.AUTO],
            };
        }
    }
}
exports.default = Thermostat;
//# sourceMappingURL=Thermostat.js.map