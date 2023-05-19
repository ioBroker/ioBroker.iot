const Capabilities = require('../Alexa/Capabilities');
const ReadOnlyDetector = require('./ReadOnlyDetector');

/**
 * @class
 */
class Door extends ReadOnlyDetector {

    get capability() {
        return new Capabilities.ContactSensor();
    }

    get categories() {
        return ['CONTACT_SENSOR'];
    }
}

module.exports = Door;