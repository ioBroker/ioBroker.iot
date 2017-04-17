var translate = require(__dirname + '/translate.js');

var dictionary = [
    {"en": "light",             "de": "Licht",              "ru": "cвет"},
    {"en": "color",             "de": "Farbe",              "ru": "цвет"},
    {"en": "backlight",         "de": "Beleuchtung",        "ru": "подсветка"},
    {"en": "blinds/shutter",    "de": "Rolladen/Fenster",   "ru": "жалюзи/окна"},
    {"en": "curtain",           "de": "Vorhänge",           "ru": "шторы"},
    {"en": "heating",           "de": "Heizung",            "ru": "отопление/Подогрев"},
    {"en": "music",             "de": "Musik",              "ru": "музыка"},
    {"en": "alarm/security",    "de": "Alarmanlage/Alarm",  "ru": "охрана"},
    {"en": "lock",              "de": "Schloß/Schloss",     "ru": "замок"},
    {"en": "door",              "de": "Tür",                "ru": "дверь"}
];

module.exports = function (lang, word) {
    return translate(dictionary, lang, word);
};