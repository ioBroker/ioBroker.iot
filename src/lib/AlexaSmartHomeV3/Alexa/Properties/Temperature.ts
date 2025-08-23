import Base from './Base';
import type { AlexaV3Request } from '../../types';

export default class Temperature extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.TemperatureSensor';
    }

    matches(event: AlexaV3Request): boolean {
        return Temperature.matches(event);
    }

    reportValue(value: number): any {
        return {
            value,
            scale: Temperature.CELSIUS_SCALE,
        };
    }
}
