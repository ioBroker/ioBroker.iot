const Properties = require('./../Properties');
const Base = require('./Base');

class PowerController extends Base {

    initProperties() {
        this._powerState = new Properties.PowerState();
        return [this._powerState];
    }

    get powerState() {
        return this._powerState;
    }
}

module.exports = PowerController;