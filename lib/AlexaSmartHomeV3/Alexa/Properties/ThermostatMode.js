const Base = require("./Base");

class ThermostatMode extends Base {

    static matches(event) {
        return event?.directive?.header?.name === 'SetThermostatMode';
    }

    matches(event) {
        return ThermostatMode.matches(event);
    }

    alexaValue(event) {
        return event.directive.payload.thermostatMode.value;
    }

    static get AUTO() {
        return 'AUTO';
    }
}

module.exports = ThermostatMode;