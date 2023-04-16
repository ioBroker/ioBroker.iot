const Base = require("./Base");

class DetectionState extends Base {

    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.MotionSensor' ||
            event?.directive?.header?.namespace === 'Alexa.ContactSensor';
    }

    matches(event) {
        return DetectionState.matches(event);
    }

    static get DETECTED() {
        return 'DETECTED'
    }

    static get NOT_DETECTED() {
        return 'NOT_DETECTED'
    }
}

module.exports = DetectionState;