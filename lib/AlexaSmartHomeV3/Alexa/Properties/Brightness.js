const AdjustableProperty = require('./AdjustableProperty');

class Brightness extends AdjustableProperty {

    matches(event) {
        return Brightness.matches(event);
    }

    alexaDirectiveValue(event) {
        return Brightness.directive(event) === Brightness.SET ? super.alexaDirectiveValue(event) : event.directive.payload['brightnessDelta'];
    }
}

module.exports = Brightness;