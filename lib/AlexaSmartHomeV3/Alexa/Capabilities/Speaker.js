const Properties = require('../Properties');
const Base = require('./Base');

class Speaker extends Base {
    initProperties() {
        this._volume = new Properties.Volume();
        this._muted = new Properties.Muted();
        return [this._volume, this._muted];
    }

    get volume() {
        return this._volume;
    }

    get muted() {
        return this._muted;
    }
}

module.exports = Speaker;