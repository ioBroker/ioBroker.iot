const AdjustableProperty = require('./AdjustableProperty');

class Percentage extends AdjustableProperty {

    matches(event) {
        return Percentage.matches(event);
    }

    alexaDirectiveValue(event) {
        return Percentage.directive(event) === Percentage.SET ? super.alexaDirectiveValue(event) : event.directive.payload['percentageDelta'];
    }
}

module.exports = Percentage;