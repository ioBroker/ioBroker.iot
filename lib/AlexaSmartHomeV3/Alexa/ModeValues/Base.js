const Utils = require("../../Helpers/Utils");

class Base {
    constructor(mode) {
        this._mode = mode;
    }

    static get value() {
        return Utils.className(this.toString());
    }

    get value() {
        return `${this._mode}.${this.constructor.name}`
    }

    get friendlyNames() {
        return []
    }

    get discoveryResponse() {
        return {
            value: this.value,
            modeResources: {
                friendlyNames: this.friendlyNames
            }
        }
    }

    get actionMappings() {
        return []
    }

    get stateMappings() {
        return []
    }
}

module.exports = Base;