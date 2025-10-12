"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const Utils_1 = require("../../Helpers/Utils");
class Base {
    _mode;
    constructor(mode) {
        this._mode = mode;
    }
    static get value() {
        return (0, Utils_1.className)(this.toString());
    }
    get value() {
        return `${this._mode}.${this.constructor.name}`;
    }
    get friendlyNames() {
        return [];
    }
    get discoveryResponse() {
        return {
            value: this.value,
            modeResources: {
                friendlyNames: this.friendlyNames,
            },
        };
    }
    get actionMappings() {
        return [];
    }
    get stateMappings() {
        return [];
    }
}
exports.Base = Base;
exports.default = Base;
//# sourceMappingURL=Base.js.map