const Base = require('./Base');

class Color extends Base {

    constructor() {
        super();
        this.hal = {
            hue: 0,
            saturation: 0,
            brightness: 0,
        };
    }

    init(opts) {
        this.hal = opts.hal;
        this._setId = opts.hal.hue;
        this._getId = opts.hal.hue;

        if (opts.alexaSetter) {
            this._alexaSetter = opts.alexaSetter;
        }
        if (opts.alexaGetter) {
            this._alexaGetter = opts.alexaGetter;
        }
    }

    matches(event) {
        return Color.matches(event) && event?.directive?.header?.name === 'SetColor';
    }

    set hal(value) {
        this._hal = value;
    }

    get hal() {
        return this._hal;
    }
}

module.exports = Color;