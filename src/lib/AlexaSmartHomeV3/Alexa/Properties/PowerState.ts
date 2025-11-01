import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class PowerState extends Base {
    matches(event: AlexaV3Request): boolean {
        const namespace = event?.directive?.header?.namespace;
        const eventName = event?.directive?.header?.name || '';
        return (
            namespace === 'Alexa.PowerController' ||
            ((this._multiPurposeProperty || this._handleSimilarEvents) &&
                namespace === 'Alexa.PercentageController' &&
                !eventName.includes('Adjust')) ||
            ((this._multiPurposeProperty || this._handleSimilarEvents) &&
                namespace === 'Alexa.BrightnessController' &&
                !eventName.includes('Adjust'))
        );
    }

    static get ON(): AlexaV3DirectiveName {
        return 'ON';
    }

    static get OFF(): AlexaV3DirectiveName {
        return 'OFF';
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        // Case when we are in dimmer or rgb lamp, and it does not have a dedicated power switch
        if (
            this._multiPurposeProperty &&
            !this._handleSimilarEvents &&
            event.directive.header.namespace === 'Alexa.PercentageController'
        ) {
            const percentage = event.directive.payload.percentage as number;
            if (percentage) {
                return PowerState.ON;
            }
            return PowerState.OFF;
        }

        if (this._handleSimilarEvents && event.directive.header.namespace === 'Alexa.PercentageController') {
            const percentage = event.directive.payload.percentage as number;
            if (percentage && !this.currentValue) {
                return PowerState.ON;
            }
            return undefined;
        }

        // Case when we are in dimmer or rgb lamp, and it does not have a dedicated power switch
        if (
            this._multiPurposeProperty &&
            !this._handleSimilarEvents &&
            event.directive.header.namespace === 'Alexa.BrightnessController'
        ) {
            const brightness = event.directive.payload.brightness as number;
            if (brightness) {
                return PowerState.ON;
            }
            return PowerState.OFF;
        }

        // Case when we are in dimmer or rgb lamp, and it the device has a dedicated power switch
        if (this._handleSimilarEvents && event.directive.header.namespace === 'Alexa.BrightnessController') {
            const brightness = event.directive.payload.brightness as number;
            if (brightness && !this.currentValue) {
                return PowerState.ON;
            }
            return undefined;
        }

        return event.directive.header.name === 'TurnOn' ? PowerState.ON : PowerState.OFF;
    }

    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        if (this._stateType === 'number') {
            const min = this.valuesRangeMin as number;
            // In this case, it is important if max is set or not
            const max = this.valueRealMax;

            if (min === undefined || max === undefined) {
                return (value as number) > 0 ? PowerState.ON : PowerState.OFF;
            }
            const mid = min + ((max as number) - min) / 2;
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
            const max = this.valueRealMax;
            if (min === undefined || max === undefined) {
                return alexaValue === PowerState.ON ? 1 : alexaValue === PowerState.OFF ? 0 : undefined;
            }
            return alexaValue === PowerState.ON ? (max as number) : alexaValue === PowerState.OFF ? min : undefined;
        }

        return alexaValue === PowerState.ON ? true : alexaValue === PowerState.OFF ? false : undefined;
    }
}
