const Utils = require("../../Helpers/Utils");

class Base {
    constructor(mode) {
        this._mode = mode
    }

    static get modeValue() {
        return Utils.className(this.toString())
    }

    get modeValue() {
        return Base.modeValue
    }

    get friendlyNames() {
        return []
    }

    get discoveryResponse() {
        return {
            value: `${this._mode}.${this.modeValue}`,
            modeResources: {
                friendlyNames: this.friendlyNames
            }
        }
    }
}

module.exports = Base;