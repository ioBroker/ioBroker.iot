const Properties = require('../Properties');
const Base = require('./Base')

class TemperatureController extends Base {
    constructor() {
        super();
    }

    get version() {
        return '3.2';
    }

    initProperties() {
        return [new Properties.TargetSetpoint(), new Properties.ThermostatMode()]
    }

    get discoverableProperties() {
        return {
            supported: [
                {
                    name: this.propertyName
                }
            ],
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
            configuration: this.configuration
        };
    }

    get configuration() {
        return {
            supportedModes: [Properties.ThermostatMode.AUTO]
        }
    }
}

module.exports = TemperatureController;