var translate = require(__dirname + '/translate.js');

var dictionary = [
    {"en": "lamp",             "de": "Lampe",                     "ru": "лампа"},
    {"en": "door",             "de": "Tür",                       "ru": "дверь"},
    {"en": "window",           "de": "Fenster",                   "ru": "окно"},
    {"en": "yellow lamp",      "de": "Gelbe Lampe",               "ru": "жёлтая лампа/желтая лампа"},
    {"en": "red lamp",         "de": "Rote Lampe",                "ru": "красная лампа"},
    {"en": "green lamp",       "de": "Grüne Lampe",               "ru": "зелёная лампа"},
    {"en": "blue lamp",        "de": "Blaue Lampe",               "ru": "синяя лампа"},
    {"en": "white lamp",       "de": "Weiße Lampe",               "ru": "белая лампа"},
    {"en": "orange lamp",      "de": "Orange Lampe",              "ru": "оранжевая лампа"},
    {"en": "christmas tree",   "de": "Weihnachtsbaum/Tannenbaum", "ru": "ёлка/елка"}
];

module.exports = function (lang, word) {
    return translate(dictionary, lang, word);
};