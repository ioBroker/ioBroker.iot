import Capabilities from '../Alexa/Capabilities';
import Control, { type StateName } from './Control';
import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';

export default class Light extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        // We support dimmer as enforced capability to allow setting group commands to dim to 0% and to 100%
        // Init enforced capabilities
        const brightnessController = new Capabilities.BrightnessController(this.brightnessInitObject());
        this._enforced = [brightnessController];

        // Init capabilities
        const powerController = new Capabilities.PowerController(this.powerStateInitObject());
        this._supported = [powerController];
    }

    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    get statesMap(): {
        set: StateName;
        actual: StateName;
    } {
        return {
            set: 'SET',
            actual: 'ON_ACTUAL',
        };
    }

    private brightnessInitObject(): {
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
