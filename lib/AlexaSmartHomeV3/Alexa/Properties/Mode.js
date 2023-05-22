const Base = require('./Base');

class Mode extends Base {

    init(opts) {
        super.init(opts);
        this._supportedModes = opts.supportedModes;
        this._instance = opts.instance;
    }

    matches(event) {
        return Mode.matches(event)
            // non-adjustable mode controller
            && 'SetMode' === event?.directive?.header?.name
            && this.instance === event?.directive?.header?.instance
            && this.supportedModes.map(mode => mode.value).includes(event?.directive?.payload?.mode);
    }

    alexaDirectiveValue(event) {
        return event.directive.payload.mode;
    }

    get supportedModes() {
        return this._supportedModes;
    }

    get instance() {
        return this._instance;
    }
}

module.exports = Mode;