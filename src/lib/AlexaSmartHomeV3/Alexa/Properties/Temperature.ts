import Base from './Base';
import type { AlexaV3Request } from '../../types';

export default class Temperature extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.TemperatureSensor';
    }

    matches(event: AlexaV3Request): boolean {
        return Temperature.matches(event);
    }

    private get scale(): 'CELSIUS' | 'FAHRENHEIT' {
        const unit = this.getSetState()?.common?.unit?.trim().toUpperCase();
        if (unit === '°F' || unit === 'F' || unit === 'FAHRENHEIT') {
            return 'FAHRENHEIT';
        }
        return 'CELSIUS';
    }

    reportValue(value: number): any {
        return {
            value,
            scale: this.scale,
        };
    }
}
