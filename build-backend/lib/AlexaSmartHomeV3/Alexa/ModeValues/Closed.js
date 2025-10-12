"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class Closed extends Base_1.default {
    get friendlyNames() {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Value.Close',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Closed',
                    locale: 'en-US',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Geschlossen',
                    locale: 'de-DE',
                },
            },
        ];
    }
    get actionMappings() {
        return [
            {
                '@type': 'ActionsToDirective',
                actions: ['Alexa.Actions.Close'],
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
                states: ['Alexa.States.Closed'],
                value: this.value,
            },
        ];
    }
}
exports.default = Closed;
//# sourceMappingURL=Closed.js.map