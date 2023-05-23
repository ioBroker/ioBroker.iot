const Properties = require('../Properties');
const Base = require('./Base')

class ColorTemperatureController extends Base {

    initProperties() {
        return [new Properties.ColorTemperatureInKelvin()];
    }
}

module.exports = ColorTemperatureController;