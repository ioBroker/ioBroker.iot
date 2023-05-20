const Utils = require("../../Helpers/Utils");

class Base {
    constructor(mode) {
        this._mode = mode;
    }

    get value() {
        return this.constructor.name;
    }

    get friendlyNames() {
        return []
    }

    get discoveryResponse() {
        return {
            value: `${this._mode}.${this.value}`,
            modeResources: {
                friendlyNames: this.friendlyNames
            }
        }
    }
}

module.exports = Base;