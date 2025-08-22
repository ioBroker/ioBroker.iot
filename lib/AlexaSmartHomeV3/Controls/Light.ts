import Capabilities from '../Alexa/Capabilities';
import Control from './Control';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalDetectorState } from '../types';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class Light extends Control {
    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new Capabilities.PowerController()];

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }

        return result;
    }

    initEnforcedCapabilities(): CapabilitiesBase[] {
        const result = [new Capabilities.BrightnessController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.brightnessInitObject());
        }

        return result;
    }

    get statesMap(): {
        set: string;
        actual: string;
    } {
        return {
            set: 'SET',
            actual: 'ON_ACTUAL',
        };
    }

    brightnessInitObject(): {
        setState: IotExternalDetectorState;
        getState: IotExternalDetectorState;
        alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
        alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    } {
        const map = this.statesMap;

        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
                return (alexaValue as number) > 0;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? 100 : 0;
            },
        };
    }
}
