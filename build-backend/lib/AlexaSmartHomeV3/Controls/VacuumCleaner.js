"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Capabilities_1 = __importDefault(require("../Alexa/Capabilities"));
const Control_1 = __importDefault(require("./Control"));
class VacuumCleaner extends Control_1.default {
    get categories() {
        return ['VACUUM_CLEANER'];
    }
    initCapabilities() {
        const result = [new Capabilities_1.default.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }
        return result;
    }
    get statesMap() {
        return {
            set: 'POWER',
            actual: undefined,
        };
    }
}
exports.default = VacuumCleaner;
//# sourceMappingURL=VacuumCleaner.js.map