"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AlexaV3Exception extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
exports.default = AlexaV3Exception;
//# sourceMappingURL=AlexaV3Exception.js.map