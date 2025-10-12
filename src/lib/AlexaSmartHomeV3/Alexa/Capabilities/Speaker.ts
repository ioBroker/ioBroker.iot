import Volume from '../Properties/Volume';
import Muted from '../Properties/Muted';
import Base from './Base';
import type { ControlStateInitObject } from '../Properties/Base';

export default class Speaker extends Base {
    private readonly _volume: Volume;
    private readonly _muted: Muted;

    constructor(volumeOpts: ControlStateInitObject, mutedOpts: ControlStateInitObject) {
        super();
        this._volume = new Volume(volumeOpts);
        this._muted = new Muted(mutedOpts);
        this._properties = [this._volume, this._muted];
    }

    get volume(): Volume {
        return this._volume;
    }

    get muted(): Muted {
        return this._muted;
    }
}
