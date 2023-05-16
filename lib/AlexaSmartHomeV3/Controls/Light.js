const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');

/**
 * @class
 */
class Light extends Control {
    get categories() {
        return ['LIGHT'];
    }

    initCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.PowerController(),
            properties: [],
        }];

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.powerStateProxy(ctrl),
                });
            }
        }

        return result;
    }

    initEnforcedCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.BrightnessController(),
            properties: [],
        }];

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.brightnessProxy(ctrl),
                });
            }
        }

        return result;
    }

    states(ctrl) {
        // this state is a mandatory one for the control, so it exists
        let setPower = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let getPower = ctrl.states.find(item => item.name === 'ON_ACTUAL');
        return [setPower, getPower];
    }

    brightnessProxy(ctrl) {
        const [setPower, getPower] = this.states(ctrl);
        return new StateProxy({
            setState: setPower,
            getState: getPower,
            alexaSetter: function (alexaValue) {
                return alexaValue > 0;
            },
            alexaGetter: function (value) {
                return value ? 100 : 0;
            },
        });
    }
}

module.exports = Light;