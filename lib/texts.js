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
        it: 'dati mancanti',
    },
    'missing intent': {
        en: 'missing intent',
        ru: 'недостающие данные',
        de: 'fehlende Daten',
        it: 'dati mancanti',
    },
    light: {
        en: '%s light',
        ru: '%s Свет',
        de: '%slight',
        it: '%s luce',
    },
    window: {
        en: '%s window',
        ru: '%s  Окно',
        de: '%sfenster',
        it: '%s finestra',
    },
    blinds: {
        en: '%s blinds',
        ru: '%s Жалюзи',
        de: '%srollo',
        it: '%s persiane',
    },
    thermostat: {
        en: '%s thermostat',
        ru: '%s  Термостат',
        de: '%sthermostat',
        it: '%s termostato',
    },
    media: {
        en: '%s media',
        ru: '%s Медиа',
        de: '%smedia',
        it: '%s media',
    },
    'Your blood glucose': {
        en: 'Your blood glucose',
        de: 'Dein Blutzucker',
        ru: 'Ваша глюкоза в крови',
        pt: 'A sua glicemia',
        nl: 'Je bloedglucose',
        fr: 'Votre glycémie',
        it: 'La tua glicemia',
        es: 'Su glucosa en sangre',
        pl: 'Twój poziom glukozy we krwi',
        'zh-cn': '你的血糖',
    },
    Error: {
        en: 'Error',
        de: 'Error',
        ru: 'Ошибка',
        pt: 'Erro',
        nl: 'Fout',
        fr: 'Erreur',
        it: 'Errore',
        es: 'Error',
        pl: 'Błąd',
        'zh-cn': '错误',
    },
};

module.exports = function (lang, word, arg) {
    if (dictionary[word]) {
        word = dictionary[word][lang] || dictionary[word].en;
    }

    return word.replace('%s', arg);
};
