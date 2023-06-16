const Properties = require('../Properties');
const Base = require('./Base');

class MotionSensor extends Base {
    initProperties() {
        return [new Properties.DetectionState()];
    }
}

module.exports = MotionSensor;