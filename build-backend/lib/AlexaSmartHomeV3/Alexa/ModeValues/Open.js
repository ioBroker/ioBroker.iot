"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class Open extends Base_1.default {
    get friendlyNames() {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Value.Open',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Opened',
                    locale: 'en-US',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Geöffnet',
                    locale: 'de-DE',
                },
            },
        ];
    }
    get actionMappings() {
        return [
            {
                '@type': 'ActionsToDirective',
                actions: ['Alexa.Actions.Open'],
                directive: {
                    name: 'SetMode',
                    payload: {
                        mode: this.value,
                    },
                },
            },
        ];
    }
    get stateMappings() {
        return [
            {
                '@type': 'StatesToValue',
                states: ['Alexa.States.Open'],
                value: this.value,
            },
        ];
    }
}
exports.default = Open;
//# sourceMappingURL=Open.js.map