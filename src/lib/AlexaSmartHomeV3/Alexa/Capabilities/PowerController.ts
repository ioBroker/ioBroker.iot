import PowerState from '../Properties/PowerState';
import Base from './Base';
import type { ControlStateInitObject } from '../Properties/Base';

export default class PowerController extends Base {
    readonly #powerState: PowerState;

    constructor(opts: ControlStateInitObject) {
        super();
        this.#powerState = new PowerState(opts);
        this._properties = [this.#powerState];
    }

    get powerState(): PowerState {
        return this.#powerState;
    }
}
