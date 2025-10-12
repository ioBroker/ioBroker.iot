"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = functions;
const translate_1 = __importDefault(require("./translate"));
const dictionary = [
    { en: 'light', it: 'luce', de: 'Licht', ru: 'cвет' },
    { en: 'color', it: 'colore', de: 'Farbe', ru: 'цвет' },
    { en: 'backlight', it: 'controluce', de: 'Beleuchtung', ru: 'подсветка' },
    { en: 'blinds/shutter', it: 'bui/otturatore', de: 'Rollladen/Rolladen/Fenster', ru: 'жалюзи/окна' },
    { en: 'curtain', it: 'tenda', de: 'Vorhänge', ru: 'шторы' },
    { en: 'heating', it: 'riscaldamento', de: 'Heizung', ru: 'отопление/Подогрев' },
    { en: 'music', it: 'musica', de: 'Musik', ru: 'музыка' },
    { en: 'alarm/security', it: 'allarme/sicurezza', de: 'Alarmanlage/Alarm', ru: 'охрана' },
    { en: 'lock', it: 'serratura', de: 'Schloß/Schloss', ru: 'замок' },
    { en: 'door', it: 'porta', de: 'Tür', ru: 'дверь' },
    { en: 'undefined', it: 'non definito', de: 'Nicht definiert', ru: 'не определена' },
];
function functions(lang, word) {
    return (0, translate_1.default)(dictionary, lang, word);
}
//# sourceMappingURL=functions.js.map