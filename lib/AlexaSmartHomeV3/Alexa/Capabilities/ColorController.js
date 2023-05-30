const Properties = require('../Properties');
const Base = require('./Base');

class ColorController extends Base {

    initProperties() {
        return [new Properties.Color()];
    }
}

module.exports = ColorController;