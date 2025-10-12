"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Control_1 = __importDefault(require("./Control"));
const Base_1 = require("../Alexa/Properties/Base");
class AdjustableControl extends Control_1.default {
    adjustableProperties() {
        return [];
    }
    isAdjustDirective(event) {
        return this.adjustableProperties().some(property => property.matches(event) && property.directive(event) === Base_1.Base.ADJUST);
    }
    valueSetter(event) {
        return this.isAdjustDirective(event) ? this.adjustValue.bind(this) : super.valueSetter(event);
    }
}
exports.default = AdjustableControl;
//# sourceMappingURL=AdjustableControl.js.map