"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
const ColorTemperatureInKelvin_1 = __importDefault(require("../Properties/ColorTemperatureInKelvin"));
class ColorTemperatureController extends Base_1.default {
    _colorTemperatureInKelvin;
    initProperties() {
        this._colorTemperatureInKelvin = new ColorTemperatureInKelvin_1.default();
        return [this._colorTemperatureInKelvin];
    }
    get colorTemperatureInKelvin() {
        return this._colorTemperatureInKelvin;
    }
}
exports.default = ColorTemperatureController;
//# sourceMappingURL=ColorTemperatureController.js.map