const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../StateProxy');
const Control = require('./Control');
/**
 * @class
 */
class Light extends Control {
    constructor(detectedControl, adapter) {
        super(detectedControl, adapter);
    }

    get supported() {
        return [
            {
                capability: new Capabilities.PowerController(),
                stateProxy: this.stateProxy(this.detectedControl)
            }
        ]
    }

    get enforced() {
        let result = {};
        result[Capabilities.BrightnessController.namespace] = this.handleBrightness;
        return result;
    }

    stateProxy(ctrl) {
        /*
            Device of type 'light' can be switched 'ON' and 'OFF'. Usually the same address (iobroker state id) can be used 
            to obtain the current state of the control. 
        */

        // this state is a mandatory one for the control, so it exists
        let setPower = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let getPower = ctrl.states.find(item => item.name === 'ON_ACTUAL');

        return new StateProxy({
            setId: setPower.id,
            getId: getPower?.id,
            setter: function (alexaValue) {
                return alexaValue === Capabilities.PowerController.ON
            },
            getter: function (value) {
                return value ? Capabilities.PowerController.ON : Capabilities.PowerController.OFF
            }
        })
    }

    handleBrightness(event) {
        const alexaValue = Capabilities.BrightnessController.alexaValue(event)

        // TODO: consider adjust brightness directive
        return alexaValue > 0;
    }
}

module.exports = Light;