const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');
/**
 * @class
 */
class Temperature extends Control {

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
                    stateProxy: this.simpleProxy(ctrl)
                })   
            }
        }

        return result;
    }

    states(ctrl) {
        // this state is a mandatory one for the control, so it exists
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');
        return [actual, actual];
    }
}

module.exports = Temperature;