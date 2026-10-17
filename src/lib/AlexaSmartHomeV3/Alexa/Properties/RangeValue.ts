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
        if (RangeValue.directive(event) === RangeValue.SET) {
            return super.alexaDirectiveValue(event);
        }
        const { rangeValueDelta, rangeValueDeltaDefault } = event.directive.payload;
        // Without an amount ("turn it down"), Alexa sends rangeValueDeltaDefault = true and
        // rangeValueDelta = -precision or +precision: use the configured step, but keep the direction
        if (rangeValueDeltaDefault && rangeValueDelta) {
            return Math.sign(rangeValueDelta) * (this.valuesRangeStep ?? Math.abs(rangeValueDelta));
        }
        return rangeValueDelta;
    }
}
