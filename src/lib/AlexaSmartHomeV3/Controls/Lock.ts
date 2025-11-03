import Capabilities from '../Alexa/Capabilities';
import Properties from '../Alexa/Properties';
import Control from './Control';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalPatternControl } from '../types';
import type { ControlStateInitObject } from '../Alexa/Properties/Base';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Lock extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const lockController = new Capabilities.LockController(this.lockStateInitObject());
        this._supported = [lockController];

        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['SMARTLOCK'];
    }

    private lockStateInitObject(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
                return alexaValue === Properties.LockState.LOCK;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? Properties.LockState.LOCKED : Properties.LockState.UNLOCKED;
            },
        };
    }
}
