import type { AlexaV3DirectiveName, AlexaV3Request } from '../../types';

import AdjustableProperty from './AdjustableProperty';

export class Volume extends AdjustableProperty {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }

    matches(event: AlexaV3Request): boolean {
        return Volume.matches(event) && ['AdjustVolume', 'SetVolume'].includes(event?.directive?.header?.name);
    }

    static directive(event: AlexaV3Request): AlexaV3DirectiveName {
        return event.directive.header.name === 'AdjustVolume' ? Volume.ADJUST : Volume.SET;
    }
}

export default Volume;
