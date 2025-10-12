"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ThermostatController_1 = __importDefault(require("../Alexa/Capabilities/ThermostatController"));
const ThermostatMode_1 = __importDefault(require("../Alexa/Properties/ThermostatMode"));
const PowerController_1 = __importDefault(require("../Alexa/Capabilities/PowerController"));
const TemperatureSensor_1 = __importDefault(require("../Alexa/Capabilities/TemperatureSensor"));
const Temperature_1 = __importDefault(require("../Alexa/Properties/Temperature"));
const PowerState_1 = __importDefault(require("../Alexa/Properties/PowerState"));
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
const Utils_1 = require("../Helpers/Utils");
const TargetSetpoint_1 = __importDefault(require("../Alexa/Properties/TargetSetpoint"));
const AdapterProvider_1 = __importDefault(require("../Helpers/AdapterProvider"));
class AirCondition extends AdjustableControl_1.default {
    _thermostatController;
    _thermostatMode;
    _powerController;
    _powerState;
    _lastKnownMode;
    get categories() {
        return ['AIR_CONDITIONER'];
    }
    adjustableProperties() {
        return [TargetSetpoint_1.default];
    }
    get dedicatedOnOff() {
        return this.states[this.statesMap.power] !== undefined;
    }
    initCapabilities() {
        this._thermostatController = new ThermostatController_1.default();
        this._thermostatMode = this._thermostatController.thermostatMode;
        this._powerController = new PowerController_1.default();
        this._powerState = this._powerController.powerState;
        const result = [new TemperatureSensor_1.default(), this._thermostatController, this._powerController];
        for (const property of result.flatMap(item => item.properties)) {
            const initObject = this.composeInitObject(property);
            if (initObject) {
                property.init(initObject);
            }
            else {
                throw new Error(`Unable to initialize property ${property.propertyName}`);
            }
        }
        return result;
    }
    async setState(property, value) {
        // if we set power ON/OFF via thermostat mode
        if (property.propertyName === PowerState_1.default.propertyName && !this.dedicatedOnOff) {
            // set the mode to the last known value or AUTO by switching power ON
            if (value) {
                this._lastKnownMode ||= this._thermostatMode.supportedModesAsEnum[ThermostatMode_1.default.AUTO];
                await AdapterProvider_1.default.setState(this._thermostatMode.setId, this._lastKnownMode);
                this._thermostatMode.currentValue = this._lastKnownMode;
                this._powerState.currentValue = true;
            }
            else {
                // set mode to OFF
                const modeOffValue = this._thermostatMode.supportedModesAsEnum[ThermostatMode_1.default.OFF];
                await AdapterProvider_1.default.setState(this._thermostatMode.setId, modeOffValue);
                this._thermostatMode.currentValue = this._lastKnownMode;
                this._powerState.currentValue = false;
            }
        }
        else {
            // just set the property
            await AdapterProvider_1.default.setState(property.setId, value);
            property.currentValue = value;
            if (property.propertyName === ThermostatMode_1.default.propertyName) {
                this._lastKnownMode = value;
                if (!this.dedicatedOnOff) {
                    this._powerState.currentValue =
                        value !== this._thermostatMode.supportedModesAsEnum[ThermostatMode_1.default.OFF];
                }
            }
        }
    }
    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider_1.default.getState(property.getId);
            // convert mode != OFF to power = true
            if (property.propertyName === this._powerState.propertyName && !this.dedicatedOnOff) {
                property.currentValue =
                    property.currentValue !== this._thermostatMode.supportedModesAsEnum[ThermostatMode_1.default.OFF];
            }
        }
        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }
        return property.currentValue;
    }
    composeInitObject(property) {
        const map = this.statesMap;
        if (property.propertyName === PowerState_1.default.propertyName) {
            return {
                setState: this.states[map.power] || this.states[map.mode],
                getState: this.states[map.power] || this.states[map.mode],
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
            // const range = Utils.configuredRangeOrDefault(this.states[map.set]);
            return {
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return (0, Utils_1.ensureValueInRange)(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return value || 0;
                },
            };
        }
        if (property.propertyName === ThermostatMode_1.default.propertyName) {
            return {
                setState: this.states[map.mode],
                getState: this.states[map.mode],
                alexaSetter: function (alexaValue) {
                    return this.supportedModesAsEnum[alexaValue];
                },
                alexaGetter: function (value) {
                    return this.supportedModesAsEnum[value];
                },
                supportedModes: [
                    ThermostatMode_1.default.AUTO,
                    ThermostatMode_1.default.COOL,
                    ThermostatMode_1.default.ECO,
                    ThermostatMode_1.default.HEAT,
                    ThermostatMode_1.default.OFF,
                ],
            };
        }
    }
}
exports.default = AirCondition;
//# sourceMappingURL=AirCondition.js.map