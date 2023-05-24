const AdjustableProperty = require('./AdjustableProperty');

class ColorTemperatureInKelvin extends AdjustableProperty {

    constructor() {
        super();
        this._colorTemperatureTable = [2200, 2700, 4000, 5500, 7000];
    }

    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.ColorTemperatureController';
    }

    static directive(event) {
        return [
            ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE,
            ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE]
            .includes(event?.directive?.header?.name) ? AdjustableProperty.ADJUST : AdjustableProperty.SET;
    }

    matches(event) {
        return ColorTemperatureInKelvin.matches(event)
            && [
                ColorTemperatureInKelvin.SET_COLOR_TEMPERATURE,
                ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE,
                ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE
            ].includes(event?.directive?.header?.name);
    }

    get colorTemperatureTable() {
        return this._colorTemperatureTable;
    }

    alexaDirectiveValue(event) {
        if (ColorTemperatureInKelvin.SET_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return event.directive.payload[this.propertyName];
        }

        if (ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return 1;
        }

        if (ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return -1;
        }
    }

    static get SET_COLOR_TEMPERATURE() {
        return 'SetColorTemperature';
    }

    static get INCREASE_COLOR_TEMPERATURE() {
        return 'IncreaseColorTemperature';
    }

    static get DECREASE_COLOR_TEMPERATURE() {
        return 'DecreaseColorTemperature';
    }

}

module.exports = ColorTemperatureInKelvin;