"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../../Helpers/Utils");
const Base_1 = __importDefault(require("./Base"));
class ThermostatMode extends Base_1.default {
    _supportedModes = [];
    init(opts) {
        super.init(opts);
        if (!opts.supportedModes || !Array.isArray(opts.supportedModes) || opts.supportedModes.length === 0) {
            throw new Error('ThermostatMode control requires supportedModes array with at least one mode');
        }
        // set mode to be AUTO for thermostats without mode at all
        this.currentValue = this.setId ? undefined : ThermostatMode.AUTO;
        this._supportedModes = opts.supportedModes;
        this._supportedModesAsEnum = (0, Utils_1.asEnum)(this._supportedModes);
    }
    static matches(event) {
        return event?.directive?.header?.name === 'SetThermostatMode';
    }
    matches(event) {
        return ThermostatMode.matches(event);
    }
    alexaDirectiveValue(event) {
        return event.directive.payload.thermostatMode?.value;
    }
    get supportedModes() {
        return this._supportedModes;
    }
    static get AUTO() {
        return 'AUTO';
    }
    static get COOL() {
        return 'COOL';
    }
    static get ECO() {
        return 'ECO';
    }
    static get HEAT() {
        return 'HEAT';
    }
    static get OFF() {
        return 'OFF';
    }
}
exports.default = ThermostatMode;
//# sourceMappingURL=ThermostatMode.js.map