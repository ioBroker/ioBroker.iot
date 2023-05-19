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

    statesMap() {
        return {
            'set': 'SET',
            'actual': 'ON_ACTUAL'
        };
    }

    brightnessInitObject(ctrl) {
        const states = this.states(ctrl);
        const map = this.statesMap();        
        return {
            setState: states[map.set],
            getState: states[map.actual],
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