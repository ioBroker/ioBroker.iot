const Base = require('./Base');

class Color extends Base {

    constructor() {
        super();
        this._hue = 0;
        this._saturation = 0;
        this._brightness = 0;
    }

    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.ColorController';
    }

    matches(event) {
        return Color.matches(event) && event?.directive?.header?.name === 'SetColor';
    }
}

module.exports = Color;