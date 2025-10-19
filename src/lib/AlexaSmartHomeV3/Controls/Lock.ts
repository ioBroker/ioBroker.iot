import Capabilities from '../Alexa/Capabilities';
import Properties from '../Alexa/Properties';
import Control from './Control';
import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import type { ControlStateInitObject } from '../Alexa/Properties/Base';

export default class Lock extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const lockController = new Capabilities.LockController(this.lockStateInitObject());
        this._supported = [lockController];
    }

    get categories(): AlexaV3Category[] {
        return ['SMARTLOCK'];
    }

    private lockStateInitObject(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.LockState.UNLOCK;
            },
            alexaGetter: function (value) {
                return value ? Properties.LockState.LOCKED : Properties.LockState.UNLOCKED;
            },
        };
    }
}
