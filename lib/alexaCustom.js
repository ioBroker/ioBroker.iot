'use strict';
const textsT = require('./texts');

function AlexaCustom(adapter) {
    let lang          = 'de';
    let response = {
        timer:          null,
        request:        null,
        callback:       null,
        sessionId:      null
    };
    const openSessions = {};

    function writeResponse(channelId, stateId, command, value) {
        //adapter.log.warn('[CUSTOM] Unknown applianceId: ' + deviceId);
    }

    function getResponse(text, shouldEndSession) {
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
                    type: 'Simple'
                },
                shouldEndSession: shouldEndSession || false
            }
        };
        response.response.card.title = textsT(lang, 'Answer from ioBroker');
        return response;
    }

    this.setLanguage = _lang => lang = _lang || 'de';

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
        adapter.setState('smart.lastResponse', text, true);
        if (response.timer) {
            clearTimeout(response.timer);
            response.timer = null;
        }
        response.callback = null;
        response.request = null;
        callback(getResponse(text, shouldEndSession));
    };

    // let example = {
    //     "session": {
    //         "sessionId": "SessionId.74267f5d-3b58-45646-bdc7-4645645",
    //         "application": {
    //             "applicationId": "amzn1.ask.skill.6cee68cd-4356-456-9d53-45646456"
    //         },
    //         "attributes": {},
    //         "user": {
    //             "userId": "amzn1.ask.account.asdasdasdas"
    //         },
    //         "new": true
    //     },
    //     "request": {
    //         "type": "IntentRequest",
    //         "requestId": "EdwRequestId.b785ca9f-6ba9-45645-a667-4645646",
    //         "locale": "de-DE",
    //         "timestamp": "2017-07-25T15:30:51Z",
    //         "intent": {
    //             "name": "controlDevice",
    //             "slots": {
    //                 "Command": {
    //                     "name": "Command",
    //                     "value": "an"
    //                 },
    //                 "Device": {
    //                     "name": "Device"
    //                 },
    //                 "Article": {
    //                     "name": "Article"
    //                 },
    //                 "Value": {
    //                     "name": "Value"
    //                 },
    //                 "Place": {
    //                     "name": "Place",
    //                     "value": "licht"
    //                 }
    //             }
    //         }
    //     },
    //     "version": "1.0"
    // }
    this.process = (request, isEnabled, callback) => {
        if (!request || !request.request) {
            adapter.log.error('Invalid request: no intent!');
            return;
        }

        if (!isEnabled) {
            if (lang === 'en') {
                callback(getResponse('The service deactivated', true));
            } else if (lang === 'ru') {
                callback(getResponse('Сервис отключен', true));
            } else {
                callback(getResponse('Der service ist deaktiviert', true));
            }

            return;
        }

        const sessionId = (request.session && request.session.sessionId) ? request.session.sessionId : '';
        if (request.request.type === 'LaunchRequest') {
            adapter.log.debug(request.request.type);
            if (lang === 'en') {
                callback(getResponse('Hello, what do you want to know or control?'));
            } else if (lang === 'ru') {
                callback(getResponse('Привет. Что вы хотите знать или контролировать?'));
            } else {
                callback(getResponse('Hallo, was möchtest Du wissen oder steuern?'));
            }
            if (openSessions[sessionId]) {
                clearTimeout(openSessions[sessionId]);
                delete openSessions[sessionId];
            }
            openSessions[sessionId] = setTimeout(() => {
                delete openSessions[sessionId];
            }, 60000); // latest after 10 mins we declare a session as closed
        } else if (request.request.type === 'IntentRequest') {
            if (request.request.intent) {
                if (openSessions[sessionId]) {
                    clearTimeout(openSessions[sessionId]);
                    openSessions[sessionId] = setTimeout(() => {
                        delete openSessions[sessionId];
                    }, 60000); // latest after 10 mins we declare a session as closed
                }

                if (request.request.intent.name === 'AMAZON.HelpIntent') {
                    adapter.log.debug(request.request.intent.name);
                    if (lang === 'en') {
                        callback(getResponse('This skill will pass all recognized words to your ioBroker installation and you can configure actions and responses there! What do you want to know or control?'));
                    } else if (lang === 'ru') {
                        callback(getResponse('Этот навык передаст все распознанные слова в вашу установку ioBroker, и вы сможете настроить действия и ответы там! Что вы хотите знать или контролировать?'));
                    } else {
                        callback(getResponse('Dieser Skill gibt alle erkannten Wörter an Deine ioBroker-Installation weiter und Du kannst dort Aktionen und Antworten konfigurieren! Was möchtest Du wissen oder steuern?'));
                    }
                } else if (request.request.intent.name === 'AMAZON.CancelIntent' || request.request.intent.name === 'AMAZON.StopIntent') {
                    adapter.log.debug(request.request.intent.name);
                    if (lang === 'en') {
                        callback(getResponse('Bye for now!', true));
                    } else if (lang === 'ru') {
                        callback(getResponse('До скорого!', true));
                    } else {
                        callback(getResponse('Bis bald!', true));
                    }
                } else {
                    if (!request || !request.request || !request.request.intent || !request.request.intent.slots) {
                        adapter.log.warn(`Unexpected ALEXA Request: ${JSON.stringify(request)}`);
                        if (lang === 'en') {
                            callback(getResponse('Please repeat your question!'));
                        } else if (lang === 'ru') {
                            callback(getResponse('Пожалуйста, повторите вопрос!'));
                        } else {
                            callback(getResponse('Bitte wiederhole die Frage!'));
                        }
                        return;
                    }
                    let slots = Object.keys(request.request.intent.slots);
                    let texts = [];
                    let textA = [];
                    slots.forEach(slot => {
                        request.request.intent.slots[slot].value && textA.push(request.request.intent.slots[slot].value);
                        texts.push(`${slot} = ${request.request.intent.slots[slot].value}`);
                    });
                    let text = textA.join(' ');

                    let text_timeout;
                    if (lang === 'en') {
                        text_timeout = 'Processing ' + text + ' is not possible!';
                    } else if (lang === 'ru') {
                        text_timeout = 'Обработка ' + text + ' не возможна!';
                    } else {
                        text_timeout = 'Die Verarbeitung von ' + text + ' ist nicht möglich!';
                    }

                    const intent = request.request.intent.name || '';
                    const commandObj = {
                        'words': textA,
                        'intent': intent,
                        'deviceId': (request.context && request.context.System && request.context.System.device && request.context.System.device.deviceId) ? request.context.System.device.deviceId : '',
                        'sessionId': (request.session && request.session.sessionId) ? request.session.sessionId : '',
                        'userId': (request.session && request.session.user && request.session.user.userId) ? request.session.user.userId : ''
                    };
                    text = intent + ' ' + text;
                    text = text.trim();

                    adapter.setState('smart.lastCommand', text, true);
                    adapter.setState('smart.lastCommandObj', JSON.stringify(commandObj), true);

                    adapter.log.debug(`${request.request.intent.name}: ${texts.join(', ')}`);

                    if (intent) {
                        if (adapter.config.text2command !== null && adapter.config.text2command !== undefined && adapter.config.text2command !== '') {
                            adapter.getForeignState(`system.adapter.text2command.${adapter.config.text2command}.alive`, (err, state) => {
                                if (state && state.val) {
                                    let timeout = setTimeout(() => {
                                        timeout = null;
                                        if (callback) {
                                            this.processAfter(request, text_timeout, true, callback);
                                            callback = null;
                                        }
                                    }, 1000);
                                    if (adapter.config.language) {
                                        text = adapter.config.language + ';' + text;
                                    }

                                    adapter.sendTo('text2command.' + adapter.config.text2command, text, result => {
                                        if (timeout) {
                                            clearTimeout(timeout);
                                            timeout = null;
                                        }
                                        const regExp = new RegExp('"' + intent.toLowerCase() + '\\s');
                                        result.response = result.response.replace(/^\w\w;/, '').replace(regExp, '"');
                                        adapter.log.debug('Response from text2command: ' + result.response);

                                        adapter.setState('smart.lastResponse', result.response, true);
                                        if (callback) {
                                            callback(getResponse(result.response, !openSessions[sessionId]));
                                            callback = null;
                                        }
                                    });
                                } else {
                                    response.timer && clearTimeout(response.timer);
                                    response.callback = callback;
                                    response.request = request;
                                    response.timer = setTimeout(() =>
                                        this.processAfter(request, text_timeout, true, callback), 200);
                                    response.sessionId = openSessions[sessionId];
                                }
                            });
                        } else {
                            response.timer && clearTimeout(response.timer);
                            response.callback = callback;
                            response.request = request;
                            response.timer = setTimeout(() =>
                                this.processAfter(request, text_timeout, true, callback), 200);
                        }
                    } else {
                        if (lang === 'en') {
                            callback(getResponse('I did not understand the question!'));
                        } else if (lang === 'ru') {
                            callback(getResponse('Я не поняла ваш вопрос!'));
                        } else {
                            callback(getResponse('Ich habe Deine Frage nicht verstanden!'));
                        }

                    }
                }
            } else {
                adapter.log.warn(`Unexpected ALEXA Request: ${JSON.stringify(request)}`);
                if (lang === 'en') {
                    callback(getResponse('Please repeat your question!'));
                } else if (lang === 'ru') {
                    callback(getResponse('Пожалуйста, повторите вопрос!'));
                } else {
                    callback(getResponse('Bitte wiederhole die Frage!'));
                }
            }
        } else if (request.request.type === 'SessionEndedRequest') {
            adapter.log.debug(`SessionEndedRequest: ${request.request.reason}`);
            // Should not be called
            callback();
        }
    };
}

module.exports = AlexaCustom;
