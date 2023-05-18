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

    states(ctrl) {
        let set = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');
        return [set, actual];
    }

    lockStateInitObject(ctrl) {
        const [setState, getState] = this.states(ctrl);
        return {
            setState,
            getState,
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