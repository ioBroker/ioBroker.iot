const Utils = require('../../Helpers/Utils');
const Base = require('./Base');

class ThermostatMode extends Base {

    init(opts) {
        super.init(opts);
        // set mode to be AUTO for thermostats without mode at all
        this.currentValue = this.setId ? undefined : ThermostatMode.AUTO;
        this._supportedModes = opts.supportedModes;
        this._supportedModesAsEnum = Utils.asEnum(this._supportedModes);
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

    get supportedModes() {
        return this._supportedModes;
    }

    get supportedModesAsEnum() {
        return this._supportedModesAsEnum;
    }

    static get AUTO() {
        return 'AUTO';
    }
    static get COOL() {
        return 'COOL';
    }
    static get ECO() {
        return 'ECO';
    }
    static get HEAT() {
        return 'HEAT';
    }
    static get OFF() {
        return 'OFF';
    }
}

module.exports = ThermostatMode;