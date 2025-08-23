import { className } from '../../Helpers/Utils';
import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3Request } from '../../types';

export default class AdjustableProperty extends Base {
    static directive(event: AlexaV3Request): AlexaV3DirectiveName {
        return event.directive.header.name === `Adjust${className(this.toString())}`
            ? AdjustableProperty.ADJUST
            : AdjustableProperty.SET;
    }
}
