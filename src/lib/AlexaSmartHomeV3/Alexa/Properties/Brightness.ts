import AdjustableProperty from './AdjustableProperty';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class Brightness extends AdjustableProperty {
    matches(event: AlexaV3Request): boolean {
        return Brightness.matches(event);
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return Brightness.directive(event) === Brightness.SET
            ? super.alexaDirectiveValue(event)
            : event.directive.payload.brightnessDelta;
    }
}
