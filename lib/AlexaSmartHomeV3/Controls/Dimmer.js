const Capabilities = require('../Alexa/Capabilities');
const AdjustableControl = require('./AdjustableControl');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');

/**
 * @class
 */
class Dimmer extends AdjustableControl {

    get categories() {
        return ['LIGHT'];
    }

    adjustableProperties() {
        return [Properties.Brightness];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.PowerController(), new Capabilities.BrightnessController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(ctrl, property))
        }

        return result;
    }

    composeInitObject(ctrl, property) {
        /*
            Device of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100.

            If there is no 'ON_SET' state available:
            - switching control 'OFF' is done via setting its brightness to 0
            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brightness.
        */

        const states = this.states(ctrl);
        const map = this.statesMap();

        if (property.propertyName === Properties.PowerState.propertyName) {
            // set byOn to the configured value or 100 otherwise
            let byOn = states[map.set].smartName?.byON;
            byOn = isNaN(byOn) ? 100 : parseInt(byOn);

            return {
                setState: states[map.on_set] || states[map.set],
                getState: states[map.on_actual] || states[map.on_set] || states[map.set],
                alexaSetter: states[map.on_set]
                    ?
                    // in case of a dedicated switch state just convert ON and OFF to a boolean
                    function (alexaValue) {
                        return alexaValue === Properties.PowerState.ON;
                    }
                    :
                    // if there is no dedicated switch state,
                    // then the ON is implemented by setting the control to the 'byOn' value
                    // and the OFF is implemented by setting the control to 0
                    function (alexaValue) {
                        return alexaValue === Properties.PowerState.ON ? byOn : 0;
                    },
                alexaGetter: (states[map.on_set] || states[map.on_actual])
                    ?
                    // in case of a dedicated switch state just convert its boolean value to ON or OFF
                    function (value) {
                        return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
                    }
                    :
                    // if there is no dedicated switch state, then the ON is defined as (brightness > 0)
                    function (value) {
                        return value > 0 ? Properties.PowerState.ON : Properties.PowerState.OFF;
                    }
            }
        }

        if (property.propertyName === Properties.Brightness.propertyName) {
            const range = Utils.configuredRangeOrDefault(states[map.set]);

            return {
                setState: states[map.set],
                getState: states[map.actual],
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, range.min, range.max);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, range.min, range.max);
                },
            };
        }
    }
}

module.exports = Dimmer;