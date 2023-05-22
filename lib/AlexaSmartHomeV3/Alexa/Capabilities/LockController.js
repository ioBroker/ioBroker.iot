const Base = require('./Base')
const Properties = require('../Properties');

class LockController extends Base {

    initProperties() {
        return [new Properties.LockState()];
    }
}

module.exports = LockController;