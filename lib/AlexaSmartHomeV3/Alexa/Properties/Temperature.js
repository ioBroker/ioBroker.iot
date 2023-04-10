const Base = require("./Base");

class Temperature extends Base {

    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.TemperatureSensor';
    }

    matches(event) {
        return Temperature.matches(event);
    }

    reportValue(value) {
        return {
            value: value,
            scale: "CELSIUS"
        }
    }
}

module.exports = Temperature;