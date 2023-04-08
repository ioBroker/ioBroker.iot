const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');
/**
 * @class
 */
class Socket extends Control {

    static get type() {
        return 'socket'
    }

    get categories() {
        return ['SWITCH']
    }

    initCapabilities(ctrl) {
        return [
            {
                capability: new Capabilities.PowerController(),
                stateProxy: this.stateProxy(ctrl, Capabilities.PowerController)
            }
        ]
    }

    stateProxy(ctrl, capability) {
        /*
            Device of type 'socket' can be switched 'ON' and 'OFF'. Usually the same address (iobroker state id) can be used 
            to obtain the current state of the control. 
        */
        // this state is a mandatory one for the control, so it exists
        let setPower = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let getPower = ctrl.states.find(item => item.name === 'ACTUAL');

        return new StateProxy({
            setId: setPower.id,
            getId: getPower?.id,
            alexaSetter: function (alexaValue) {
                return alexaValue === Capabilities.PowerController.ON
            },
            alexaGetter: function (value) {
                return value ? Capabilities.PowerController.ON : Capabilities.PowerController.OFF
            }
        })
    }
}

module.exports = Socket;