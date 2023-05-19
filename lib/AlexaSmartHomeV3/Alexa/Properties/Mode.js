const Base = require('./Base');

class Mode extends Base {

    init(opts) {
        super.init(opts);
        this._supportedModes = opts.supportedModes;
    }

    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.ModeController';
    }

    matches(event) {
        return Mode.matches(event);
    }

    alexaDirectiveValue(event) {
        return event.directive.header.name;
    }

    get supportedModes() {
        return this._supportedModes;
    }
}

module.exports = Mode;