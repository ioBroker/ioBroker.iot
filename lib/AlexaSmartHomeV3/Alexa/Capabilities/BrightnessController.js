const Base = require('./Base')

class BrightnessController extends Base {
    constructor() {
        super();
    }

    static get propertyName() {
        return 'brightness'
    }

    get propertyName() {
        return BrightnessController.propertyName
    }

    alexaValue(event) {
        return BrightnessController.directive(event) === BrightnessController.SET ? super.alexaValue(event) : event.directive.payload['brightnessDelta']
    }

    static directive(event) {
        return event.directive.header.name === 'AdjustBrightness' ? BrightnessController.ADJUST : BrightnessController.SET;
    }

    static get ADJUST() { return 'ADJUST'; }
    static get SET() { return 'SET'; }
}

module.exports = BrightnessController;