const Base = require('./Base')

class TemperatureController extends Base {
    constructor() {
        super();
    }
    static get propertyName() {
        return 'targetSetpoint'
    }

    get propertyName() {
        return TemperatureController.propertyName
    }

    get version() {
        return '3.2';
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
            supportedModes: ["AUTO"]
        }
    }

    reportValue(value) {
        return {
            value: value,
            scale: "CELSIUS"
        }
    }
}

module.exports = TemperatureController;