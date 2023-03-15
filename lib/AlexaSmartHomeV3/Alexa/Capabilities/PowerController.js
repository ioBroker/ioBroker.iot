const Base = require('./Base')

class PowerController extends Base {
    constructor() {
        super();
    }

    get propertyName() {
        return 'powerState'
    }

    static get ON() {
        return 'ON'
    }

    static get OFF() {
        return 'OFF'
    }


    alexaValue(event) {
        return event.directive.header.name === 'TurnOn' ? PowerController.ON : PowerController.OFF;
    }
}

module.exports = PowerController;