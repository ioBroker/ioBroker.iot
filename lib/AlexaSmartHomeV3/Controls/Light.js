const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Light extends Control {
    get categories() {
        return ['LIGHT'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.PowerController()];

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject(ctrl))
        };

        return result;
    }

    initEnforcedCapabilities(ctrl) {
        let result = [new Capabilities.BrightnessController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.brightnessInitObject(ctrl));
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

    brightnessInitObject(ctrl) {
        const [setPower, getPower] = this.states(ctrl);
        return {
            setState: setPower,
            getState: getPower,
            alexaSetter: function (alexaValue) {
                return alexaValue > 0;
            },
            alexaGetter: function (value) {
                return value ? 100 : 0;
            },
        };
    }
}

module.exports = Light;