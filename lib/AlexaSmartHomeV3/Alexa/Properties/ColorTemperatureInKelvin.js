const Base = require('./Base');

class ColorTemperatureInKelvin extends Base {

    constructor() {
        super();
        this._colorTemperatureTable = [2200, 2700, 4000, 5500, 7000];
    }

    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.ColorTemperatureController';
    }

    matches(event) {
        return ColorTemperatureInKelvin.matches(event)
            && ['SetColorTemperature', 'IncreaseColorTemperature', 'DecreaseColorTemperature'].includes(event?.directive?.header?.name);
    }
}

module.exports = ColorTemperatureInKelvin;