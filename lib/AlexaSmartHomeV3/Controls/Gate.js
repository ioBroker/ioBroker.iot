const Capabilities = require('../Alexa/Capabilities');
const Modes = require('../Alexa/ModeValues');
const Properties = require('../Alexa/Properties');
const Control = require('./Control');

/**
 * @class
 */
class Gate extends Control {

    get categories() {
        return ['DOOR'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.ModeController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.modeInitObject(ctrl));
        }
        return result;
    }

    modeInitObject(ctrl) {
        const states = this.states(ctrl);
        const map = this.statesMap();

        const mode = 'GateState';
        return {
            setState: states[map.set],
            getState: states[map.set],
            alexaSetter: function (alexaValue) {
                return alexaValue === Modes.Open.asString();
            },
            alexaGetter: function (value) {
                return value ? Modes.Open.modeValue() : Modes.Closed.modeValue();
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