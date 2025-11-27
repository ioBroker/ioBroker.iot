import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';
import AdjustableProperty from './AdjustableProperty';

export default class RangeValue extends AdjustableProperty {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === `Alexa.RangeController`;
    }

    matches(event: AlexaV3Request): boolean {
        return RangeValue.matches(event);
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return RangeValue.directive(event) === RangeValue.SET
            ? super.alexaDirectiveValue(event)
            : event.directive.payload.rangeValueDeltaDefault
              ? this.valuesRangeStep
              : event.directive.payload.rangeValueDelta;
    }
}
