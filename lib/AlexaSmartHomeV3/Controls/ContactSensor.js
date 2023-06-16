const Capabilities = require('../Alexa/Capabilities');
const ReadOnlyDetector = require('./ReadOnlyDetector');

/**
 * @class
 */
class ContactSensor extends ReadOnlyDetector {
    get capability() {
        return new Capabilities.ContactSensor();
    }

    get categories() {
        return ['CONTACT_SENSOR'];
    }
}

module.exports = ContactSensor;