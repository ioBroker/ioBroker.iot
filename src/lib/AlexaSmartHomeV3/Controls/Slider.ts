// import Capabilities from '../Alexa/Capabilities';
// import AdjustableControl from './AdjustableControl';
// import RangeValue from '../Alexa/Properties/RangeValue';
// import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
// import { type AlexaV3DirectiveValue, type IotExternalPatternControl } from '../types';
// import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';
// import { ensureValueInRange } from '../Helpers/Utils';
//
// export default class SliderControl extends AdjustableControl {
//     constructor(detectedControl: IotExternalPatternControl) {
//         super(detectedControl);
//         const rangeController = new Capabilities.RangeController(this.rangeInitObject());
//         this._supported = [rangeController];
//         const health = this.connectivityInitObject();
//         if (health) {
//             this._supported.push(new EndpointHealth(health));
//         }
//     }
//
//     adjustableProperties(): (typeof PropertiesBase)[] {
//         return [RangeValue];
//     }
//
//     async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
//         // todo: byON
//         return super.setState(property, value);
//     }
//
//     protected rangeInitObject(): ControlStateInitObject {
//         const map = this.statesMap;
//         return {
//             setState: this.states[map.set]!,
//             getState: this.states[map.actual]!,
//             alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
//                 return ensureValueInRange(
//                     alexaValue as number,
//                     this.valuesRangeMin as number,
//                     this.valuesRangeMax as number,
//                 );
//             },
//             alexaGetter: function (
//                 this: PropertiesBase,
//                 value: ioBroker.StateValue | undefined,
//             ): AlexaV3DirectiveValue {
//                 return value as number;
//             },
//         };
//     }
// }

import AdjustablePercentageControl from './AdjustablePercentageControl';

export default class Slider extends AdjustablePercentageControl {}
