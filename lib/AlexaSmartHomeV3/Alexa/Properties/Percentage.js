const Base = require('./Base');

class Percentage extends Base {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.PercentageController';
    }

    matches(event) {
        return Percentage.matches(event);
    }

    static directive(event) {
        return event.directive.header.name === 'AdjustPercentage' ? Percentage.ADJUST : Percentage.SET;
    }

    alexaDirectiveValue(event) {
        return Percentage.directive(event) === Percentage.SET ? super.alexaDirectiveValue(event) : event.directive.payload['percentageDelta'];
    }
}

module.exports = Percentage;