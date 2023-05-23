const Properties = require('../Properties');
const Base = require('./Base')

class BrightnessController extends Base {

    initProperties() {
        this._brightness = new Properties.Brightness();
        return [this._brightness];
    }

    get brightness() {
        return this._brightness;
    }
}

module.exports = BrightnessController;