const Capabilities = require('../Alexa/Capabilities');
const ReadOnlyDetector = require('./ReadOnlyDetector');

/**
 * @class
 */
class Motion extends ReadOnlyDetector {

    get capability() {
        return new Capabilities.MotionSensor();
    }

    get categories() {
        return ['MOTION_SENSOR'];
    }
}

module.exports = Motion;