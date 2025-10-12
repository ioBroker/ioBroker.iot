"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactSensor = void 0;
const Base_1 = __importDefault(require("./Base"));
const Properties_1 = __importDefault(require("../Properties"));
class ContactSensor extends Base_1.default {
    initProperties() {
        return [new Properties_1.default.DetectionState()];
    }
}
exports.ContactSensor = ContactSensor;
exports.default = ContactSensor;
//# sourceMappingURL=ContactSensor.js.map