const Capabilities = require('../Alexa/Capabilities');
const Properties = require('../Alexa/Properties');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');

/**
 * @class
 */
class Lock extends Control {
    get categories() {
        return ['SMARTLOCK'];
    }

    initCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.LockController(),
            properties: [],
        }];

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.lockStateProxy(ctrl),
                });
            }
        }

        return result;
    }

    states(ctrl) {
        let set = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');
        return [set, actual];
    }

    lockStateProxy(ctrl) {
        const [setState, getState] = this.states(ctrl);
        return new StateProxy({
            setState,
            getState,
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.LockState.LOCK;
            },
            alexaGetter: function (value) {
                return value ? Properties.LockState.LOCKED : Properties.LockState.UNLOCKED;
            },
        });
    }
}

module.exports = Lock;