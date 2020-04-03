'use strict';
const textsT = require('./texts');
const moment = require('moment');

function AlexaCustomBlood(adapter) {
    let lang          = 'de';
    let response = {
        timer:          null,
        request:        null,
        callback:       null,
        sessionId:      null
    };

    function getResponse(text, shouldEndSession, lang) {
        let response = {
            version: '1.0',
            sessionAttributes: {},
            response: {
                outputSpeech: {
                    type: 'PlainText',
                    text: text
                },
                card: {
                    content: text,
                    title: '',
                    type: 'Standard',
                    image: {
                        smallImageUrl: '', // "https://url-to-small-card-image...",
                        largeImageUrl: ''  // "https://url-to-large-card-image..."
                    }
                },
                shouldEndSession: shouldEndSession || false
            }
        };
        if (lang) {
            response.response.card.title = textsT(lang, 'Your blood glucose is');
        } else {
            response.response.card.title = textsT(lang, 'Error');
        }
        adapter.log.debug('Response blood sugar: ' + text);

        console.log(JSON.stringify(response, null, 2));

        return response;
    }

    this.setLanguage = _lang => {
        lang = _lang || 'de';
    };

    this.setResponse = (resp, shouldEndSession) => {
        let obj = {
            responseText: '',
            shouldEndSession: (shouldEndSession === undefined) ? !response.sessionId : shouldEndSession
        };
        if (typeof resp === 'string' && resp.startsWith('{') && resp.endsWith('}')) {
            try {
                resp = JSON.parse(resp);
            }
            catch (err) {

            }
        }
        if (typeof resp === 'object') {
            if (resp.responseText) {
                obj.responseText = resp.responseText;
            }
            if (resp.shouldEndSession !== undefined) obj.shouldEndSession = resp.shouldEndSession;
        }
        else {
            obj.responseText = resp;
        }

        if (response.timer && response.callback) {
            this.processAfter(response.request, obj.responseText, obj.shouldEndSession, response.callback);
        }
    };

    this.processAfter = (request, text, shouldEndSession, callback) => {
        if (typeof shouldEndSession === 'function') {
            callback = shouldEndSession;
            shouldEndSession = undefined
        }

        if (response.timer) {
            clearTimeout(response.timer);
            response.timer = null;
        }

        response.callback = null;
        response.request  = null;
        callback(getResponse(text, shouldEndSession));
    };

    // let example = {
    //     "version": "1.0",
    //     "session": {
    //         "new": true,
    //         "sessionId": "amzn1.echo-api.session.xxx",
    //         "application": {
    //             "applicationId": "amzn1.ask.skill.xxx"
    //         },
    //         "user": {
    //             "userId": "amzn1.ask.account.xxx",
    //             "accessToken": "xxx"
    //         }
    //     },
    //     "context": {
    //         "System": {
    //             "application": {
    //                 "applicationId": "amzn1.ask.skill.a499fa96-f795-42a5-a911-584c223d03e1"
    //             },
    //             "user": {
    //                 "userId": "amzn1.ask.account.xxx",
    //                 "accessToken": "xxx"
    //             },
    //             "device": {
    //                 "deviceId": "amzn1.ask.device.xxx",
    //                 "supportedInterfaces": {}
    //             },
    //             "apiEndpoint": "https://api.eu.amazonalexa.com",
    //             "apiAccessToken": "yyy"
    //         }
    //     },
    //     "request": {
    //         "type": "LaunchRequest",
    //         "requestId": "amzn1.echo-api.request.ddd",
    //         "timestamp": "2020-04-03T10:43:23Z",
    //         "locale": "de-DE",
    //         "shouldLinkResultBeReturned": false
    //     }
    // };
    this.process = (request, bloodInfoID, callback) => {
        if (!request || !request.request) {
            adapter.log.error('Invalid request: no intent!');
            return;
        }

        // Get locale
        let _lang = lang;
        if (request.request.locale) {
            _lang = request.request.locale.split('-')[0];
            if (_lang !== 'en' && _lang !== 'de' && _lang !== 'ru') {
                _lang = 'en'
            }
        }

        if (!bloodInfoID) {
            if (lang === 'en') {
                callback(getResponse('The service deactivated', true));
            } else if (lang === 'ru') {
                callback(getResponse('Сервис отключен', true));
            } else {
                callback(getResponse('Der service ist deaktiviert', true));
            }

            return;
        }

        adapter.getForeignObject(bloodInfoID, (err, obj) => {
            adapter.getForeignState(bloodInfoID, (err, state) => {
                if (!state || !state.val) {
                    if (_lang === 'en') {
                        callback(getResponse('No valid value found', true));
                    } else if (_lang === 'ru') {
                        callback(getResponse('Значения не найдено', true));
                    } else {
                        callback(getResponse('Kein gültiger Wert gefunden', true));
                    }
                } else {
                    let unit = (obj && obj.common && obj && obj.common.unit) || 'mg/dl';
                    const min = moment(new Date(state.ts)).locale(_lang).fromNow();
                    if (_lang === 'en') {
                        unit = unit === 'mmol/l' || unit === 'mmol' ? 'millimole per liter' : 'milligram per deciliter';
                    } else if (_lang === 'ru') {
                        unit = unit === 'mmol/l' || unit === 'mmol' ? 'миллимоль на литр' : 'миллиграм на децилитр';
                    } else {
                        unit = unit === 'mmol/l' || unit === 'mmol' ? 'Millimol pro Liter' : 'Milligramm pro Deziliter';
                    }

                    let text;
                    if (!adapter.config.amazonAlexaBloodShortAnswer) {
                        if (_lang === 'en') {
                            text = `Blood sugar is ${state.val} ${unit === 'mmol/l' || unit === 'mmol' ? 'millimole per liter' : 'milligram per deciliter'} and was measured ${min}`;
                        } else if (_lang === 'ru') {
                            text = `Уровень сахара в крови ${state.val} ${unit === 'mmol/l' || unit === 'mmol' ? 'миллимоль на литр' : 'миллиграм на децилитр'} и измерялся ${min}.`;
                        } else {
                            text = `Blutzucker ist ${state.val} ${unit === 'mmol/l' || unit === 'mmol' ? 'Millimol pro Liter' : 'Milligramm pro Deziliter'} und wurde ${min} gemessen`;
                        }
                    } else {
                        if (_lang === 'en') {
                            text = `${state.val} ${min}`;
                        } else if (_lang === 'ru') {
                            text = `${state.val} ${min}.`;
                        } else {
                            text = `${state.val} ${min}`;
                        }
                    }

                    callback(getResponse(text, true, _lang));
                }
            });
        });
    };
}

module.exports = AlexaCustomBlood;
