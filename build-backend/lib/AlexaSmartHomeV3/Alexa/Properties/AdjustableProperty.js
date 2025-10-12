"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../../Helpers/Utils");
const Base_1 = __importDefault(require("./Base"));
class AdjustableProperty extends Base_1.default {
    static directive(event) {
        return event.directive.header.name === `Adjust${(0, Utils_1.className)(this.toString())}`
            ? AdjustableProperty.ADJUST
            : AdjustableProperty.SET;
    }
}
exports.default = AdjustableProperty;
//# sourceMappingURL=AdjustableProperty.js.map