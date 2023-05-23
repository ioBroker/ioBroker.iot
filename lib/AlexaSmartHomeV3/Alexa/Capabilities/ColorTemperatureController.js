const Properties = require('../Properties');
const Base = require('./Base')

class ColorTemperatureController extends Base {

    initProperties() {
        this._colorTemperatureInKelvin = new Properties.ColorTemperatureInKelvin();
        return [this._colorTemperatureInKelvin];
    }

    get colorTemperatureInKelvin() {
        return this._colorTemperatureInKelvin;
    }
}

module.exports = ColorTemperatureController;