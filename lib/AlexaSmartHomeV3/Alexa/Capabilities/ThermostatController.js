const Properties = require('../Properties');
const Base = require('./Base');

class ThermostatController extends Base {
    get version() {
        return '3.2';
    }

    initProperties() {
        this._thermostatMode = new Properties.ThermostatMode();
        return [new Properties.TargetSetpoint(), this._thermostatMode];
    }

    get thermostatMode() {
        return this._thermostatMode;
    }

    get alexaResponse() {
        return {
            interface: this.namespace,
            version: this.version,
            properties: this.discoverableProperties,
            configuration: this.configuration,
        };
    }

    get configuration() {
        return {
            supportedModes: this._thermostatMode.supportedModes,
        };
    }
}

module.exports = ThermostatController;