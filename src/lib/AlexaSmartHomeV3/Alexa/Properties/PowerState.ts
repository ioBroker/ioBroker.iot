import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class PowerState extends Base {
    matches(event: AlexaV3Request): boolean {
        const namespace = event?.directive?.header?.namespace;
        return (
            namespace === 'Alexa.PowerController' ||
            (this._multiPurposeProperty && namespace === 'Alexa.PercentageController') ||
            (this._multiPurposeProperty && namespace === 'Alexa.BrightnessController')
        );
    }

    static get ON(): AlexaV3DirectiveName {
        return 'ON';
    }

    static get OFF(): AlexaV3DirectiveName {
        return 'OFF';
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        if (this._multiPurposeProperty && event.directive.header.namespace === 'Alexa.PercentageController') {
            const percentage = event.directive.payload.percentage as number;
            const min = this.valuesRangeMin as number;
            const max = this.valuesRangeMax as number;
            if (min === undefined || max === undefined) {
                return percentage > 0 ? PowerState.ON : PowerState.OFF;
            }
            if (percentage > min) {
                return PowerState.ON;
            }
            return PowerState.OFF;
        }
        if (this._multiPurposeProperty && event.directive.header.namespace === 'Alexa.BrightnessController') {
            const percentage = event.directive.payload.brightness as number;
            if (percentage) {
                return PowerState.ON;
            }
            return PowerState.OFF;
        }

        return event.directive.header.name === 'TurnOn' ? PowerState.ON : PowerState.OFF;
    }

    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        if (this._stateType === 'number') {
            const min = this.valuesRangeMin as number;
            const max = this.valuesRangeMax as number;
            if (min === undefined || max === undefined) {
                return (value as number) > 0 ? PowerState.ON : PowerState.OFF;
            }
            const mid = min + (max - min) / 2;
            if ((value as number) >= mid) {
                return PowerState.ON;
            }
            return PowerState.OFF;
        }
        return value === true ? PowerState.ON : value === false ? PowerState.OFF : undefined;
    }

    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        if (this._stateType === 'number') {
            const min = this.valuesRangeMin as number;
            const max = this.valuesRangeMax as number;
            if (min === undefined || max === undefined) {
                return alexaValue === PowerState.ON ? 1 : alexaValue === PowerState.OFF ? 0 : undefined;
            }
            return alexaValue === PowerState.ON ? max : alexaValue === PowerState.OFF ? min : undefined;
        }

        return alexaValue === PowerState.ON ? true : alexaValue === PowerState.OFF ? false : undefined;
    }
}
