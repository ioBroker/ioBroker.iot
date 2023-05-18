const Base = require('./Base');

class Brightness extends Base {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.BrightnessController';
    }

    matches(event) {
        return Brightness.matches(event);
    }

    static directive(event) {
        return event.directive.header.name === 'AdjustBrightness' ? Brightness.ADJUST : Brightness.SET;
    }

    alexaDirectiveValue(event) {
        return Brightness.directive(event) === Brightness.SET ? super.alexaDirectiveValue(event) : event.directive.payload['brightnessDelta'];
    }
}

module.exports = Brightness;