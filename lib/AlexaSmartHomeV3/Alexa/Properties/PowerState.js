const Base = require('./Base');

class PowerState extends Base {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.PowerController';
    }

    matches(event) {
        return PowerState.matches(event);
    }

    static get ON() {
        return 'ON';
    }

    static get OFF() {
        return 'OFF';
    }

    alexaDirectiveValue(event) {
        return event.directive.header.name === 'TurnOn' ? PowerState.ON : PowerState.OFF;
    }
}

module.exports = PowerState;