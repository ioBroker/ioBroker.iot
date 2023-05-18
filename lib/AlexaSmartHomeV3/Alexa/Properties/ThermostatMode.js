const Base = require('./Base');

class ThermostatMode extends Base {

    init(opts) {
        super.init(opts);
        // set mode to be AUTO for thermostats without mode at all
        this.currentValue = this.setId ? undefined : ThermostatMode.AUTO;
    }

    static matches(event) {
        return event?.directive?.header?.name === 'SetThermostatMode';
    }


    matches(event) {
        return ThermostatMode.matches(event);
    }

    alexaDirectiveValue(event) {
        return event.directive.payload.thermostatMode.value;
    }

    static get AUTO() {
        return 'AUTO';
    }
}

module.exports = ThermostatMode;