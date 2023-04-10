const Base = require('./Base')

class TemperatureSensor extends Base {
    constructor() {
        super();
    }
    static get propertyName() {
        return 'temperature'
    }
    get propertyName() {
        return TemperatureSensor.propertyName
    }

    reportValue(value) {
        return {
            value: value,
            scale: "CELSIUS"
        }
    }
}

module.exports = TemperatureSensor;