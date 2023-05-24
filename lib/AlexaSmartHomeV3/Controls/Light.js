const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Light extends Control {

    get categories() {
        return ['LIGHT'];
    }

    initCapabilities() {
        let result = [new Capabilities.PowerController()];

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject())
        }

        return result;
    }

    initEnforcedCapabilities() {
        let result = [new Capabilities.BrightnessController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.brightnessInitObject());
        }

        return result;
    }

    get statesMap() {
        return {
            'set': 'SET',
            'actual': 'ON_ACTUAL'
        };
    }

    brightnessInitObject() {
        const map = this.statesMap;

        return {
            setState: this.states[map.set],
            getState: this.states[map.actual],
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