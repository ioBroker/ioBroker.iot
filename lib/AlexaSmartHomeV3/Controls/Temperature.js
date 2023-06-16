const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Temperature extends Control {
    get categories() {
        return ['TEMPERATURE_SENSOR'];
    }

    initCapabilities() {
        let result = [new Capabilities.TemperatureSensor()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.blankInitObject())
        }

        return result;
    }
}

module.exports = Temperature;