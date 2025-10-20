import Base from './Base';
import type { AlexaV3Request } from '../../types';

export default class RelativeHumidity extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.HumiditySensor';
    }

    matches(event: AlexaV3Request): boolean {
        return RelativeHumidity.matches(event);
    }
}
