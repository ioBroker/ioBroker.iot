"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ThermostatMode_1 = __importDefault(require("../Properties/ThermostatMode"));
const TargetSetpoint_1 = __importDefault(require("../Properties/TargetSetpoint"));
const Base_1 = __importDefault(require("./Base"));
class ThermostatController extends Base_1.default {
    _thermostatMode;
    get version() {
        return '3.2';
    }
    initProperties() {
        this._thermostatMode = new ThermostatMode_1.default();
        return [new TargetSetpoint_1.default(), this._thermostatMode];
    }
    get thermostatMode() {
        return this._thermostatMode;
    }
    get alexaResponse() {
        return {
            interface: this.namespace,
            version: this.version,
            properties: this.discoverableProperties,
            configuration: this.configuration,
        };
    }
    get configuration() {
        return {
            ordered: false,
            supportedModes: this._thermostatMode.supportedModes,
        };
    }
}
exports.default = ThermostatController;
//# sourceMappingURL=ThermostatController.js.map