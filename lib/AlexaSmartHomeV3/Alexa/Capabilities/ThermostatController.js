const Properties = require('../Properties');
const Base = require('./Base')

class ThermostatController extends Base {
    constructor() {
        super();
    }

    get version() {
        return '3.2';
    }

    initProperties() {
        return [new Properties.TargetSetpoint(), new Properties.ThermostatMode()];
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
            supportedModes: [Properties.ThermostatMode.AUTO],
        };
    }
}

module.exports = ThermostatController;