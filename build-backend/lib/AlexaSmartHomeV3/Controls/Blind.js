"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdjustablePercentageControl_1 = __importDefault(require("./AdjustablePercentageControl"));
class Blind extends AdjustablePercentageControl_1.default {
    get categories() {
        return ['INTERIOR_BLIND'];
    }
}
exports.default = Blind;
//# sourceMappingURL=Blind.js.map