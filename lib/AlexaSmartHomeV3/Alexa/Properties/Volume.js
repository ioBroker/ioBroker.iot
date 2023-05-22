const AdjustableProperty = require('./AdjustableProperty');

class Volume extends AdjustableProperty {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }

    matches(event) {
        return Volume.matches(event)
            && ['AdjustVolume', 'SetVolume'].includes(event?.directive?.header?.name);

    }

    static directive(event) {
        return event.directive.header.name === 'AdjustVolume' ? Volume.ADJUST : Volume.SET;
    }
}

module.exports = Volume;