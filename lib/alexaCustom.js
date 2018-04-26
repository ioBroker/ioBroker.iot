'use strict';

function AlexaCustom(adapter) {
    let lang          = 'de';

    function writeResponse(channelId, stateId, command, value) {
        //adapter.log.warn('Unknown applianceId: ' + deviceId);
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
        if (lang === 'en') {
            response.response.card.title = 'Answer from ioBroker';
        } else if (lang === 'ru') {
            response.response.card.title = 'Ответ от ioBroker';
        } else {
            response.response.card.title = 'Antwort von ioBroker';
        }
        return response;
    }

    this.setLanguage = (_lang) => {
        lang = _lang || 'de';
    };

    this.processAfter = (request, text, callback) => {
        let response;
        if (!request.request.intent.slots.device.value) {
            if (lang === 'en') {
                text = 'It is unclear what to do';
            } else if (lang === 'ru') {
                text = 'Непонятно что делать';
            } else {
                text = 'Es ist nicht klar was zu machen.';
            }
        } else if (!request.request.intent.slots.place.value) {
            text = 'Bitte sagen Sie wo?';
            if (lang === 'en') {
                text = 'Plase say the place?';
            } else if (lang === 'ru') {
                text = 'Назовите местою';
            } else {
                text = 'Bitte sagen Sie wo?';
            }
        } else {
            text = `${request.request.intent.slots.place.value} in ${request.request.intent.slots.place.value} ist nicht klar`;
        }
        adapter.setState('smart.lastResponse', text, true);
        callback(getResponse(text));
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
                callback(getResponse('Service deactivated', true));
            } else if (lang === 'ru') {
                callback(getResponse('Сервис отключен', true));
            } else {
                callback(getResponse('Service ist deaktiviert', true));
            }

            return;
        }

        if (request.request.type === 'LaunchRequest') {
            adapter.log.debug(`LaunchRequest`);
            if (lang === 'en') {
                callback(getResponse('Hello, what do you want to do?'));
            } else if (lang === 'ru') {
                callback(getResponse('Привет. Что хотите сделать?'));
            } else {
                callback(getResponse('Hallo, was wollen Sie wissen?'));
            }
        } else if (request.request.type === 'IntentRequest') {

            let slots = Object.keys(request.request.intent.slots);
            let texts = [];
            let textA = [];
            slots.forEach(slot => {
                textA.push(request.request.intent.slots[slot].value);
                texts.push(`${slot} = ${request.request.intent.slots[slot].value}`);
            });
            let text = textA.join(' ');

            adapter.setState('smart.lastCommand', text, true);

            adapter.log.debug(`${request.request.intent.name}: ${texts.join(', ')}`);

            if (request.request.intent.name === 'systemStatus') {
                if (adapter.config.text2command !== null && adapter.config.text2command !== undefined && adapter.config.text2command !== '') {
                    adapter.getForeignState(`system.adapter.text2command.${adapter.config.text2command}.alive`, (err, state) => {
                        if (state && state.val) {
                            let timeout = setTimeout(() => {
                                timeout = null;
                                if (callback) {
                                    this.processAfter(request, text, callback);
                                    callback = null;
                                }
                            }, 1000);
                            if (adapter.config.language) {
                                text = adapter.config.language + ';' + text;
                            }

                            adapter.sendTo('text2command.' + adapter.config.text2command, text, result => {
                                adapter.log.debug('Response from text2command: ' + result.response);
                                if (timeout) {
                                    clearTimeout(timeout);
                                    timeout = null;
                                }
                                result.response = result.response.replace(/^\w\w;/, '');

                                adapter.setState('smart.lastResponse', result.response, true);
                                if (callback) {
                                    callback(getResponse(result.response, true));
                                    callback = null;
                                }
                            });
                        } else {
                            this.processAfter(request, text, callback);
                        }
                    });
                } else {
                    this.processAfter(request, text, callback);
                }
            } else {
                callback(getResponse('Es ist mir nicht klar was gefragt ist'));
            }
        } if (request.request.type === 'SessionEndedRequest') {
            adapter.log.debug(`SessionEndedRequest: ${request.request.reason}`);
            // Should not be called
            callback();
        }
    };
}

module.exports = AlexaCustom;