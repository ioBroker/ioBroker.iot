import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class TargetSetpoint extends Base {
    static matches(event: AlexaV3Request): boolean {
        return (
            event?.directive?.header?.name === 'SetTargetTemperature' ||
            event?.directive?.header?.name === 'AdjustTargetTemperature'
        );
    }

    matches(event: AlexaV3Request): boolean {
        return TargetSetpoint.matches(event);
    }

    static directive(event: AlexaV3Request): AlexaV3DirectiveName {
        return event.directive.header.name === 'AdjustTargetTemperature' ? TargetSetpoint.ADJUST : TargetSetpoint.SET;
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return TargetSetpoint.directive(event) === TargetSetpoint.SET
            ? event.directive.payload.targetSetpoint!.value
            : event.directive.payload.targetSetpointDelta!.value;
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
