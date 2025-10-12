"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TemperatureSensor_1 = __importDefault(require("../Alexa/Capabilities/TemperatureSensor"));
const Control_1 = __importDefault(require("./Control"));
class Temperature extends Control_1.default {
    get categories() {
        return ['TEMPERATURE_SENSOR'];
    }
    initCapabilities() {
        const result = [new TemperatureSensor_1.default()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.blankInitObject());
        }
        return result;
    }
}
exports.default = Temperature;
//# sourceMappingURL=Temperature.js.map