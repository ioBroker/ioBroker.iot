"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MotionSensor_1 = __importDefault(require("../Alexa/Capabilities/MotionSensor"));
const ReadOnlyDetector_1 = __importDefault(require("./ReadOnlyDetector"));
class Motion extends ReadOnlyDetector_1.default {
    get capability() {
        return new MotionSensor_1.default();
    }
    get categories() {
        return ['MOTION_SENSOR'];
    }
}
exports.default = Motion;
//# sourceMappingURL=Motion.js.map