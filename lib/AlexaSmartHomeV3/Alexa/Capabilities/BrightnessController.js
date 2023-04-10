const Properties = require('../Properties');
const Base = require('./Base')

class BrightnessController extends Base {
    constructor() {
        super();
    }

    initProperties() {
        return [new Properties.Brightness]
    }
}

module.exports = BrightnessController;