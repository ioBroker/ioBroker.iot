import Volume from '../Properties/Volume';
import Muted from '../Properties/Muted';
import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';

export default class Speaker extends Base {
    private _volume: Volume | undefined;
    private _muted: Muted | undefined;

    initProperties(): PropertiesBase[] {
        this._volume = new Volume();
        this._muted = new Muted();
        return [this._volume, this._muted];
    }

    get volume(): Volume {
        return this._volume!;
    }

    get muted(): Muted {
        return this._muted!;
    }
}
