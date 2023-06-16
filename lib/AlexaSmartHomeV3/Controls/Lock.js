const Capabilities = require('../Alexa/Capabilities');
const Properties = require('../Alexa/Properties');
const Control = require('./Control');

/**
 * @class
 */
class Lock extends Control {
    get categories() {
        return ['SMARTLOCK'];
    }

    initCapabilities() {
        let result = [new Capabilities.LockController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.lockStateInitObject());
        }
        return result;
    }

    lockStateInitObject() {
        const map = this.statesMap;
        return {
            setState: this.states[map.set],
            getState: this.states[map.actual],
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.LockState.UNLOCK;
            },
            alexaGetter: function (value) {
                return value ? Properties.LockState.UNLOCKED : Properties.LockState.LOCKED;
            },
        };
    }
}

module.exports = Lock;