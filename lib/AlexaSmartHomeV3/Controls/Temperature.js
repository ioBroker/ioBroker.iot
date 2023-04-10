const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');
/**
 * @class
 */
class Temperature extends Control {

    static get type() {
        return 'temperature'
    }

    get categories() {
        return ['TEMPERATURE_SENSOR']
    }

    initCapabilities(ctrl) {
        return [
            {
                capability: new Capabilities.TemperatureSensor(),
                stateProxy: this.stateProxy(ctrl, Capabilities.TemperatureSensor)
            }
        ]
    }

    stateProxy(ctrl, capability) {
        // this state is a mandatory one for the control, so it exists
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');

        if (capability.name === Capabilities.TemperatureSensor.name) {

            return new StateProxy({
                setId: actual.id,
                getId: actual.id
            })
        }
    }
}

module.exports = Temperature;