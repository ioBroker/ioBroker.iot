"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdjustableProperty_1 = __importDefault(require("./AdjustableProperty"));
class Brightness extends AdjustableProperty_1.default {
    matches(event) {
        return Brightness.matches(event);
    }
    alexaDirectiveValue(event) {
        return Brightness.directive(event) === Brightness.SET
            ? super.alexaDirectiveValue(event)
            : event.directive.payload.brightnessDelta;
    }
}
exports.default = Brightness;
//# sourceMappingURL=Brightness.js.map