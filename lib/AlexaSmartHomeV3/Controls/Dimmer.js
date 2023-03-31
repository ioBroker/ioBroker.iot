const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../StateProxy');
const Control = require('./Control');
const Helpers = require('./../Helpers');
/**
 * @class
 */
class Dimmer extends Control {
    constructor(detectedControl, adapter) {
        super(detectedControl, adapter);
    }

    static get type() {
        return 'dimmer'
    }

    get categories() {
        return ['LIGHT']
    }

    initCapabilities(ctrl) {
        return [
            {
                capability: new Capabilities.PowerController(),
                stateProxy: this.stateProxy(ctrl, Capabilities.PowerController)
            },
            {
                capability: new Capabilities.BrightnessController(),
                stateProxy: this.stateProxy(ctrl, Capabilities.BrightnessController)
            }
        ]
    }

    stateProxy(ctrl, capability) {
        /*
            Device of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100. 

            If there is no 'ON_SET' state available:
            - switching control 'OFF' is done via setting its brightness to 0
            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brigthness.
        */

        // this state is a mandatory one for the control, so it exists
        let setBrightness = ctrl.states.find(s => s.name === 'SET');
        // these ones are all optional
        let getBrightness = ctrl.states.find(s => s.name === 'ACTUAL');
        let setPower = ctrl.states.find(s => s.name === 'ON_SET');
        let getPower = ctrl.states.find(s => s.name === 'ON_ACTUAL');
        const valuesRangeMin = this.valuesRangeMin;
        const valuesRangeMax = this.valuesRangeMax;


        // PowerController
        if (capability.name === Capabilities.PowerController.name) {
            // set byOn to the configured value or 100 otherwise
            let byOn = setBrightness.smartName?.byON;
            byOn = isNaN(byOn) ? 100 : parseInt(byOn);

            return new StateProxy({
                setId: setPower?.id || setBrightness.id,
                getId: getPower?.id || setPower?.id,
                alexaSetter: setPower
                    ?
                    // in case of a dedicated switch state just convert ON and OFF to a boolean
                    function (alexaValue) {
                        return alexaValue === Capabilities.PowerController.ON;
                    }
                    :
                    // if there is no dedicated switch state,
                    // then the ON is implemented by setting the control to the 'byOn' value
                    // and the OFF is implemented by setting the control to 0
                    function (alexaValue) {
                        return alexaValue === Capabilities.PowerController.ON ? byOn : 0;
                    },
                alexaGetter: (setPower || getPower)
                    ?
                    // in case of a dedicated switch state just convert its boolean value to ON or OFF
                    function (value) {
                        return value ? Capabilities.PowerController.ON : Capabilities.PowerController.OFF;
                    }
                    :
                    // if there is no dedicated switch state, then the ON is defined as (brightness > 0)
                    function (value) {
                        return value > 0 ? Capabilities.PowerController.ON : Capabilities.PowerController.OFF;
                    }
            })
        }

        if (capability.name === Capabilities.BrightnessController.name) {
            return new StateProxy({
                setId: setBrightness.id,
                getId: getBrightness?.id,
                alexaSetter: function (alexaValue) {
                    return Helpers.denormalize_0_100(alexaValue, valuesRangeMin, valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return Helpers.normalize_0_100(value, valuesRangeMin, valuesRangeMax);
                }
            })
        }
    }
}

module.exports = Dimmer;