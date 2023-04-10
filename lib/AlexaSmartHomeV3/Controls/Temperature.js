const Capabilities = require('../Alexa/Capabilities');
const Properties = require('../Alexa/Properties');
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

        let result = [{
            capability: new Capabilities.TemperatureSensor(),
            properties: []
        }]

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

    stateProxy(ctrl, capability) {
        // this state is a mandatory one for the control, so it exists
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');

        if (capability.propertyName === Properties.Temperature.propertyName) {

            return new StateProxy({
                setId: actual.id,
                getId: actual.id
            })
        }
    }
}

module.exports = Temperature;