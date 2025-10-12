"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = functions;
const translate_1 = __importDefault(require("./translate"));
const dictionary = [
    { en: 'lamp', de: 'Lampe', ru: 'лампа' },
    { en: 'door', de: 'Tür', ru: 'дверь' },
    { en: 'window', de: 'Fenster', ru: 'окно' },
    { en: 'yellow lamp', de: 'Gelbe Lampe', ru: 'жёлтая лампа/желтая лампа' },
    { en: 'red lamp', de: 'Rote Lampe', ru: 'красная лампа' },
    { en: 'green lamp', de: 'Grüne Lampe', ru: 'зелёная лампа' },
    { en: 'blue lamp', de: 'Blaue Lampe', ru: 'синяя лампа' },
    { en: 'white lamp', de: 'Weiße Lampe', ru: 'белая лампа' },
    { en: 'orange lamp', de: 'Orange Lampe', ru: 'оранжевая лампа' },
    { en: 'christmas tree', de: 'Weihnachtsbaum/Tannenbaum', ru: 'ёлка/елка' },
];
function functions(lang, word) {
    return (0, translate_1.default)(dictionary, lang, word);
}
//# sourceMappingURL=devices.js.map