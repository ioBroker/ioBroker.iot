import { type AlexaV3Category } from '../types';
import AdjustablePercentageControl from './AdjustablePercentageControl';

export default class Percentage extends AdjustablePercentageControl {
    get categories(): AlexaV3Category[] {
        return ['OTHER'];
    }
}
