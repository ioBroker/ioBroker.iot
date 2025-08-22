import Capabilities from '../Alexa/Capabilities';
import Modes from '../Alexa/ModeValues';
import Control from './Control';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import type { Base as ModeBase } from '../Alexa/ModeValues/Base';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalDetectorState } from '../types';

export default class Gate extends Control {
    get categories(): AlexaV3Category[] {
        return ['GARAGE_DOOR'];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new Capabilities.ModeController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.modeInitObject());
        }
        return result;
    }

    modeInitObject(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
        instance?: string;
        supportedModes?: ModeBase[];
    } {
        const map = this.statesMap;
        const mode = 'Gate.Position';

        return {
            setState: this.states[map.set]!,
            getState: this.states[map.set]!,
            alexaSetter: function (alexaValue) {
                return alexaValue === `${mode}.${Modes.Open.value}`;
            },
            alexaGetter: function (value) {
                return value ? `${mode}.${Modes.Open.value}` : `${mode}.${Modes.Closed.value}`;
            },
            instance: mode,
            supportedModes: [new Modes.Open(mode), new Modes.Closed(mode)],
        };
    }
}
