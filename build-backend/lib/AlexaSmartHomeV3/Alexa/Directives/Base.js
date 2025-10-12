"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = __importDefault(require("../../Helpers/Logger"));
const Utils_1 = require("../../Helpers/Utils");
class Base {
    log;
    constructor() {
        this.log = new Logger_1.default(this);
    }
    static get namespace() {
        return `Alexa.${(0, Utils_1.className)(this.toString())}`;
    }
    /**
     * Checks whether the directive matches, i.e., can handle the event Alexa sends to the skill
     *
     * @param event Contains the Alexa event.
     */
    static matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }
    handle(_event, _endpointManager) {
        return Promise.resolve(null);
    }
}
exports.default = Base;
//# sourceMappingURL=Base.js.map