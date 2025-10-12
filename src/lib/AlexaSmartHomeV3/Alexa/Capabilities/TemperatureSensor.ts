import Properties from '../Properties';
import Base from './Base';
import type { ControlStateInitObject } from '../Properties/Base';

export default class TemperatureSensor extends Base {
    constructor(opts: ControlStateInitObject) {
        super();
        this._properties = [new Properties.Temperature(opts)];
    }
}
