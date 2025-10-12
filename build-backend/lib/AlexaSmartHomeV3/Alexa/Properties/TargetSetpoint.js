"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class TargetSetpoint extends Base_1.default {
    static matches(event) {
        return (event?.directive?.header?.name === 'SetTargetTemperature' ||
            event?.directive?.header?.name === 'AdjustTargetTemperature');
    }
    matches(event) {
        return TargetSetpoint.matches(event);
    }
    static directive(event) {
        return event.directive.header.name === 'AdjustTargetTemperature' ? TargetSetpoint.ADJUST : TargetSetpoint.SET;
    }
    alexaDirectiveValue(event) {
        return TargetSetpoint.directive(event) === TargetSetpoint.SET
            ? event.directive.payload.targetSetpoint.value
            : event.directive.payload.targetSetpointDelta.value;
    }
    reportValue(value) {
        return {
            value,
            scale: TargetSetpoint.CELSIUS_SCALE,
        };
    }
}
exports.default = TargetSetpoint;
//# sourceMappingURL=TargetSetpoint.js.map