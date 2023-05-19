const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Temperature extends Control {

    get categories() {
        return ['TEMPERATURE_SENSOR'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.TemperatureSensor()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.blankInitObject(ctrl))
        }

        return result;
    }
}

module.exports = Temperature;