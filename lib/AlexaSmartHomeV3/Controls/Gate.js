const Capabilities = require('../Alexa/Capabilities');
const Modes = require('../Alexa/ModeValues');
const Control = require('./Control');

/**
 * @class
 */
class Gate extends Control {
    get categories() {
        return ['GARAGE_DOOR'];
    }

    initCapabilities() {
        let result = [new Capabilities.ModeController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.modeInitObject());
        }
        return result;
    }

    modeInitObject() {
        const map = this.statesMap;
        const mode = 'Gate.Position';
        return {
            setState: this.states[map.set],
            getState: this.states[map.set],
            alexaSetter: function (alexaValue) {
                return alexaValue === `${mode}.${Modes.Open.value}`;
            },
            alexaGetter: function (value) {
                return value ? `${mode}.${Modes.Open.value}` : `${mode}.${Modes.Closed.value}`;
            },
            instance: mode,
            supportedModes: [
                new Modes.Open(mode),
                new Modes.Closed(mode)
            ]
        }
    }
}

module.exports = Gate;