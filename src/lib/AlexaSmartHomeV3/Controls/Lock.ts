import Capabilities from '../Alexa/Capabilities';
import Properties from '../Alexa/Properties';
import Control from './Control';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalDetectorState } from '../types';

export default class Lock extends Control {
    get categories(): AlexaV3Category[] {
        return ['SMARTLOCK'];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new Capabilities.LockController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.lockStateInitObject());
        }
        return result;
    }

    lockStateInitObject(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.LockState.UNLOCK;
            },
            alexaGetter: function (value) {
                return value ? Properties.LockState.UNLOCKED : Properties.LockState.LOCKED;
            },
        };
    }
}
