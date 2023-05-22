const AdjustableProperty = require('./AdjustableProperty');

class Volume extends AdjustableProperty {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }

    matches(event) {
        return Volume.matches(event);
    }

    static directive(event) {
        return event.directive.header.name === 'AdjustVolume' ? Volume.ADJUST : Volume.SET;
    }

    // alexaDirectiveValue(event) {
    //     return Volume.directive(event) === Volume.SET ? super.alexaDirectiveValue(event) : event.directive.payload['volume'];
    // }
}

module.exports = Volume;