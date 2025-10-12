import Control from './Control';
import { Base as PropertiesBase } from '../Alexa/Properties/Base';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../types';

export default abstract class AdjustableControl extends Control {
    abstract adjustableProperties(): (typeof PropertiesBase)[];

    isAdjustDirective(event: AlexaV3Request): boolean {
        return this.adjustableProperties().some(
            property => property.matches(event) && property.directive(event) === PropertiesBase.ADJUST,
        );
    }

    valueSetter(
        event: AlexaV3Request,
    ): (event: AlexaV3Request, property: PropertiesBase) => Promise<AlexaV3DirectiveValue> {
        return this.isAdjustDirective(event) ? this.adjustValue.bind(this) : super.valueSetter(event);
    }
}
