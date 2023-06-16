const Properties = require('../Properties');
const Base = require('./Base');

class LockController extends Base {
    initProperties() {
        return [new Properties.LockState()];
    }
}

module.exports = LockController;