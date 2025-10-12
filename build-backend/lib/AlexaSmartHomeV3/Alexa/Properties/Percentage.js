"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdjustableProperty_1 = __importDefault(require("./AdjustableProperty"));
class Percentage extends AdjustableProperty_1.default {
    matches(event) {
        return Percentage.matches(event);
    }
    alexaDirectiveValue(event) {
        return Percentage.directive(event) === Percentage.SET
            ? super.alexaDirectiveValue(event)
            : event.directive.payload.percentageDelta;
    }
}
exports.default = Percentage;
//# sourceMappingURL=Percentage.js.map