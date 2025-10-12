"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Capabilities_1 = __importDefault(require("../Alexa/Capabilities"));
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
const Percentage_1 = __importDefault(require("../Alexa/Properties/Percentage"));
class AdjustablePercentageControl extends AdjustableControl_1.default {
    adjustableProperties() {
        return [Percentage_1.default];
    }
    initCapabilities() {
        const result = [new Capabilities_1.default.PercentageController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.percentageInitObject());
        }
        return result;
    }
    async setState(property, value) {
        // todo: byON
        return super.setState(property, value);
    }
}
exports.default = AdjustablePercentageControl;
//# sourceMappingURL=AdjustablePercentageControl.js.map