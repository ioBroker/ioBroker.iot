const Base = require('./Base')
const Properties = require('./../Properties');

class PowerController extends Base {
    constructor() {
        super();
    }

    initProperties() {
        return [new Properties.PowerState]
    }
}

module.exports = PowerController;