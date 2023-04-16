const Base = require('./Base')
const Properties = require('../Properties');

class ContactSensor extends Base {
    constructor() {
        super();
    }

    initProperties() {
        return [new Properties.DetectionState()]
    }
}

module.exports = ContactSensor;