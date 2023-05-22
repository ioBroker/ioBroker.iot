const Properties = require('../Properties');
const Base = require('./Base')

class BrightnessController extends Base {

    initProperties() {
        return [new Properties.Brightness()];
    }
}

module.exports = BrightnessController;