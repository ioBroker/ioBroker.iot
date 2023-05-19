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

    initCapabilities(ctrl) {
        let result = [new Capabilities.LockController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.lockStateInitObject(ctrl));
        }
        return result;
    }

    lockStateInitObject(ctrl) {
        const states = this.states(ctrl);
        const map = this.statesMap();
        return {
            setState: states[map.set],
            getState: states[map.actual],
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.LockState.LOCK;
            },
            alexaGetter: function (value) {
                return value ? Properties.LockState.LOCKED : Properties.LockState.UNLOCKED;
            },
        };
    }
}

module.exports = Lock;