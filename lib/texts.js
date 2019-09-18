'use strict';

const dictionary = {
    'Answer from ioBroker': {
        en: 'Answer from ioBroker',
        ru: 'Ответ от ioBroker',
        de: 'Antwort vom ioBroker',
    },
    'The service deactivated': {
        en: 'The service deactivated',
        ru: 'Сервис отключен',
        de: 'Der service ist deaktiviert',
    },
    'missing inputs': {
        en: 'missing inputs',
        ru: 'Неправильные параметры',
        de: 'Falsche Parameter',
    },
    'missing data': {
        en: 'missing data',
        ru: 'недостающие данные',
        de: 'fehlende Daten',
        it: 'dati mancanti'
    },
    'missing intent': {
        en: 'missing intent',
        ru: 'недостающие данные',
        de: 'fehlende Daten',
        it: 'dati mancanti'
    },
    light: {
        en: '%s light',
        ru: '%s Свет',
        de: '%slight',
        it: '%s luce'
    },
    window: {
        en: '%s window',
        ru: '%s  Окно',
        de: '%sfenster',
        it: '%s finestra'
    },
    blinds: {
        en: '%s blinds',
        ru: '%s Жалюзи',
        de: '%srollo',
        it: '%s persiane'
    },
    thermostat: {
        en: '%s thermostat',
        ru: '%s  Термостат',
        de: '%sthermostat',
        it: '%s termostato'
    },
    media: {
        en: '%s media',
        ru: '%s Медиа',
        de: '%smedia',
        it: '%s media'
    }
};

module.exports = function (lang, word, arg) {
    if (dictionary[word]) {
        word = dictionary[word][lang] || dictionary[word].en;
    }

    return word.replace('%s', arg);
};