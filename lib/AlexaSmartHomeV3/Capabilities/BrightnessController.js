const Base = require('./Base')

class BrightnessController extends Base {
    constructor() {
        super();
    }

    get propertyName() {
        return 'brightness'
    }

    directive(event) {
        return event.directive.header.name === 'AdjustBrightness' ? 'ADJUST' : 'SET';
    }
}

module.exports = BrightnessController;