import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';
import AdjustableProperty from './AdjustableProperty';

export default class Percentage extends AdjustableProperty {
    matches(event: AlexaV3Request): boolean {
        return Percentage.matches(event);
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return Percentage.directive(event) === Percentage.SET
            ? super.alexaDirectiveValue(event)
            : event.directive.payload.percentageDelta;
    }

    /** Converts an Alexa value to an ioBroker value */
    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        // Convert alexa value 0-100 to ioBroker value min-max
        if (typeof alexaValue === 'number') {
            const value =
                (this.valueRealMin as number) +
                (((this.valueRealMax as number) - (this.valueRealMin as number)) * alexaValue) / 100;
            return Math.round(value);
        }
        return undefined;
    }

    /** Converts an ioBroker value to an Alexa value */
    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        // Convert ioBroker Value min-max to Alexa value 0-100
        if (typeof value === 'number') {
            const alexaValue =
                ((value - (this.valueRealMin as number)) * 100) /
                ((this.valueRealMax as number) - (this.valueRealMin as number));
            return Math.round(alexaValue);
        }
        return undefined;
    }
}
