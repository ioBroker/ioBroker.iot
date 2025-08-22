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
}
