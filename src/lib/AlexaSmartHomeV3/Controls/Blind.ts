import AdjustablePercentageControl from './AdjustablePercentageControl';
import type { AlexaV3Category } from '../types';

export default class Blind extends AdjustablePercentageControl {
    get categories(): AlexaV3Category[] {
        return ['INTERIOR_BLIND'];
    }
}
