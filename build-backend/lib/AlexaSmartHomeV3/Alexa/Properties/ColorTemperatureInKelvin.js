"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdjustableProperty_1 = __importDefault(require("./AdjustableProperty"));
class ColorTemperatureInKelvin extends AdjustableProperty_1.default {
    static _colorTemperatureTable = [2200, 2700, 4000, 5500, 7000];
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.ColorTemperatureController';
    }
    static directive(event) {
        return [
            ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE,
            ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE,
        ].includes(event?.directive?.header?.name)
            ? AdjustableProperty_1.default.ADJUST
            : AdjustableProperty_1.default.SET;
    }
    matches(event) {
        return (ColorTemperatureInKelvin.matches(event) &&
            [
                ColorTemperatureInKelvin.SET_COLOR_TEMPERATURE,
                ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE,
                ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE,
            ].includes(event?.directive?.header?.name));
    }
    get colorTemperatureTable() {
        return ColorTemperatureInKelvin._colorTemperatureTable;
    }
    alexaDirectiveValue(event) {
        if (ColorTemperatureInKelvin.SET_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return super.alexaDirectiveValue(event);
        }
        if (ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return 1;
        }
        if (ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return -1;
        }
    }
    static get SET_COLOR_TEMPERATURE() {
        return 'SetColorTemperature';
    }
    static get INCREASE_COLOR_TEMPERATURE() {
        return 'IncreaseColorTemperature';
    }
    static get DECREASE_COLOR_TEMPERATURE() {
        return 'DecreaseColorTemperature';
    }
}
exports.default = ColorTemperatureInKelvin;
//# sourceMappingURL=ColorTemperatureInKelvin.js.map