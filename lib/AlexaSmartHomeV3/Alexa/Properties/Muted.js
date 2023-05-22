const Base = require('./Base');

class Muted extends Base {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }

    matches(event) {
        return Muted.matches(event);
    }
}

module.exports = Muted;