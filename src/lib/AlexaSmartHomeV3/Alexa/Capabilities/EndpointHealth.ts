import Properties from '../Properties';
import Base from './Base';
import type { ControlStateInitObject } from '../Properties/Base';

export default class EndpointHealth extends Base {
    constructor(opts: ControlStateInitObject) {
        super();
        opts = opts || {};
        opts.getState ||= { id: '', smartName: '', common: {}, name: 'UNREACH' };
        opts.setState ||= { id: '', smartName: '', common: {}, name: 'UNREACH' };

        this._properties = [new Properties.Connectivity(opts)];
    }
}
