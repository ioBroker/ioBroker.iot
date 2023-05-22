const Properties = require('../Properties');
const Base = require('./Base')

class TemperatureSensor extends Base {

    initProperties() {
        return [new Properties.Temperature()];
    }
}

module.exports = TemperatureSensor;