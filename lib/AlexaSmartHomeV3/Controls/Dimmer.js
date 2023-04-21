const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');
/**
 * @class
 */
class Dimmer extends Control {

    get categories() {
        return ['LIGHT']
    }

    initCapabilities(ctrl) {
        let result = [
            {
                capability: new Capabilities.PowerController(),
                properties: []
            },
            {
                capability: new Capabilities.BrightnessController(),
                properties: []
            }
        ]

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.stateProxy(ctrl, property)
                })
            }
        }

        return result;
    }

    valueSetter(event) {
        if (Properties.Brightness.matches(event)
            && Properties.Brightness.directive(event) === Properties.Brightness.ADJUST) {
            return this.adjustValue.bind(this);
        }
        return super.valueSetter(event);
    }

    stateProxy(ctrl, property) {
        /*
            Device of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100. 

            If there is no 'ON_SET' state available:
            - switching control 'OFF' is done via setting its brightness to 0
            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brightness.
        */

        // this state is a mandatory one for the control, so it exists
        let setBrightness = ctrl.states.find(s => s.name === 'SET');
        // these are all optional
        let getBrightness = ctrl.states.find(s => s.name === 'ACTUAL');
        let setPower = ctrl.states.find(s => s.name === 'ON_SET');
        let getPower = ctrl.states.find(s => s.name === 'ON_ACTUAL');

        if (property.propertyName === Properties.PowerState.propertyName) {
            // set byOn to the configured value or 100 otherwise
            let byOn = setBrightness.smartName?.byON;
            byOn = isNaN(byOn) ? 100 : parseInt(byOn);

            return new StateProxy({
                setState: setPower || setBrightness,
                getState: getPower || setPower || setBrightness,
                alexaSetter: setPower
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
                alexaGetter: (setPower || getPower)
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
            })
        }

        if (property.propertyName === Properties.Brightness.propertyName) {
            const proxy = new StateProxy({
                setState: setBrightness,
                getState: getBrightness
            });

            return new StateProxy({
                setState: setBrightness,
                getState: getBrightness,
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, proxy.valuesRangeMin, proxy.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, proxy.valuesRangeMin, proxy.valuesRangeMax);
                }
            })
        }
    }
}

module.exports = Dimmer;