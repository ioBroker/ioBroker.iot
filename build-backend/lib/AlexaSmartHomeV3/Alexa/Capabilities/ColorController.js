"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Properties_1 = __importDefault(require("../Properties"));
const Base_1 = __importDefault(require("./Base"));
class ColorController extends Base_1.default {
    initProperties() {
        return [new Properties_1.default.Color()];
    }
}
exports.default = ColorController;
//# sourceMappingURL=ColorController.js.map