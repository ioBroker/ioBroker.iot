'use strict';
const textsT = require('./texts');
const moment = require('moment');
let getImage;
const ALEXA_CUSTOM_BLOOD_SUGAR = 'amzn1.ask.skill.a499fa96-f795-42a5-a911-584c223d03e1';

function AlexaCustomBlood(adapter) {
    let lang          = 'de';
    let defaultHistory = '';
    let response = {
        timer:          null,
        request:        null,
        callback:       null,
        sessionId:      null,
    };

    try {
        getImage = getImage || require('./getImage');
    } catch (e) {
        adapter.log.warn(`Cannot initialize getImage: ${e}`);
    }

    function getResponse(text, image, shouldEndSession, lang) {
        let response = {
            version: '1.0',
            sessionAttributes: {},
            response: {
                outputSpeech: {
                    type: 'PlainText',
                    text,
                },
                card: {
                    text,
                    title: '',
                    type: 'Standard',
                    image: {
                        largeImageUrl: image,
                    },
                },
                shouldEndSession: shouldEndSession || false,
            }
        };
        if (lang) {
            response.response.card.title = textsT(lang, 'Your blood glucose');
        } else {
            response.response.card.title = textsT(lang, 'Error');
        }
        adapter.log.debug(`Response blood sugar: ${text}`);

        console.log(JSON.stringify(response, null, 2));

        return response;
    }

    this.getAppId = () => ALEXA_CUSTOM_BLOOD_SUGAR;

    this.setSettings = (_lang, _defaultHistory) => {
        lang = _lang || 'de';
        defaultHistory = _defaultHistory;
    };

    this.setResponse = (resp, shouldEndSession) => {
        let obj = {
            responseText: '',
            shouldEndSession: (shouldEndSession === undefined) ? !response.sessionId : shouldEndSession,
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
    function renderImage(bloodInfoID, lang) {
        // expected:
        // {
        //      from: timestamp // default now - 3 hours
        //      to:   timestamp // default now
        //      width: image width // default 1200
        //      height: image width // default 800
        //      format: svg/png/jpg // default png
        // }
        const now = Date.now();

        if (!getImage) {
            return Promise.reject('No getImage loaded');
        }

        if (!defaultHistory) {
            return getImage('no history instance');
        } else {
            return new Promise((resolve, reject) =>
                adapter.sendTo(defaultHistory, 'getHistory', {
                    id: bloodInfoID,
                    options: {
                        start:     now - 3 * 3600000,
                        end:       now,
                        aggregate: 'none' // or 'none' to get raw values
                    }
                }, result => {
                    if (!result || !result.result) {
                        result.result = (result && result.error) || 'no data received';
                    }

                    getImage(result.result, null, null, null, lang)
                        .then(image => resolve(image))
                        .catch(e => reject(e));
                }));
        }
    }

    this.process = async (request, bloodInfoID) => {
        if (!request || !request.request) {
            adapter.log.error('Invalid request: no intent!');
            return {error: 'Invalid request: no intent!'};
        }

        // Get locale
        let _lang = lang;
        if (request.request.locale) {
            _lang = request.request.locale.split('-')[0];
            if (_lang !== 'en' && _lang !== 'de' && _lang !== 'ru') {
                _lang = 'en';
            }
        }

        if (!bloodInfoID) {
            if (lang === 'en') {
                return getResponse('The service deactivated', true);
            } else if (lang === 'ru') {
                return getResponse('Сервис отключен', true);
            } else {
                return getResponse('Der service ist deaktiviert', true);
            }
        }

        const obj = await adapter.getForeignObjectAsync(bloodInfoID);
        const state = await adapter.getForeignStateAsync(bloodInfoID);
        if (!state || !state.val) {
            if (_lang === 'en') {
                return getResponse('No valid value found', true);
            } else if (_lang === 'ru') {
                return getResponse('Значения не найдено', true);
            } else {
                return getResponse('Kein gültiger Wert gefunden', true);
            }
        } else {
            try {
                const image = await renderImage(bloodInfoID, _lang);
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

                return getResponse(text, image, true, _lang);
            } catch (e) {
                adapter.log.warn(`Cannot generate chart: ${e}`);
                return null;
            }
        }
    };
}

module.exports = AlexaCustomBlood;
