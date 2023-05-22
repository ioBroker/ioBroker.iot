const Base = require('./Base')
const Properties = require('../Properties');

class MotionSensor extends Base {

    initProperties() {
        return [new Properties.DetectionState()];
    }
}

module.exports = MotionSensor;