import Base from './Base';
import type { AlexaV3Capability } from '../../types';

export default class SceneController extends Base {
    constructor() {
        super();
        // SceneController doesn't have properties
        this._properties = [];
    }

    /**
     * Scenes don't report state proactively
     */
    get proactivelyReported(): boolean {
        return false;
    }

    /**
     * Scenes don't support ReportState
     */
    get retrievable(): boolean {
        return false;
    }

    /**
     * Override alexaResponse to not include properties since SceneController doesn't have any
     */
    get alexaResponse(): AlexaV3Capability {
        return {
            interface: this.namespace,
            version: this.version,
            type: 'AlexaInterface',
            supportsDeactivation: false,
        };
    }
}
