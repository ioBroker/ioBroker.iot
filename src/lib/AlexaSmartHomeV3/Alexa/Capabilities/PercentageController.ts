import Properties from '../Properties';
import Base from './Base';
import type { ControlStateInitObject } from '../Properties/Base';

export default class PercentageController extends Base {
    constructor(opts: ControlStateInitObject) {
        super();
        this._properties = [new Properties.Percentage(opts)];
    }
}
