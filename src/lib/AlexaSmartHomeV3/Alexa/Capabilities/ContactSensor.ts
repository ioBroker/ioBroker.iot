import Base from './Base';
import Properties from '../Properties';
import type { ControlStateInitObject } from '../Properties/Base';

export class ContactSensor extends Base {
    constructor(opts: ControlStateInitObject) {
        super();
        this._properties = [new Properties.DetectionState(opts)];
    }
}

export default ContactSensor;
