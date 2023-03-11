const Base = require('./Base')

class PowerController extends Base {
    constructor() {
        super();
    }

    get propertyName() {
        return 'powerState'
    }

    alexaValue(event) {
        return event.directive.header.name === 'TurnOn' ? 'ON' : 'OFF';
    }
}

module.exports = PowerController;