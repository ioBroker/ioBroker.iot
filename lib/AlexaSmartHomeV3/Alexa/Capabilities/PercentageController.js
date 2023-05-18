const Properties = require('../Properties');
const Base = require('./Base')

class PercentageController extends Base {
    constructor() {
        super();
    }

    initProperties() {
        return [new Properties.Percentage()];
    }
}

module.exports = PercentageController;