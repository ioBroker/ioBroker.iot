"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class Temperature extends Base_1.default {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.TemperatureSensor';
    }
    matches(event) {
        return Temperature.matches(event);
    }
    reportValue(value) {
        return {
            value,
            scale: Temperature.CELSIUS_SCALE,
        };
    }
}
exports.default = Temperature;
//# sourceMappingURL=Temperature.js.map