import textsT from './texts';
import type { IotAdapterConfig } from './types';

// Stop phrases all in lower case!
// Required by v2 custom skill to detect when the user wants to cancel the conversation
const stopPhrases: { [language: string]: string[] } = {
    de: ['es reicht', 'ich bin fertig', 'ende', 'abbrechen', 'stopp', 'stop', 'beenden', 'danke', 'danke schön'],
    en: ['enough', 'i am done', "i'm done", 'stop', 'quit', 'bye', 'thanks', 'thank you'],
    ru: ['достаточно', 'я готов', 'хватит'],
};

export type AlexaCustomResponse = {
    version: string;
    sessionAttributes: { [key: string]: string };
    response: {
        outputSpeech: {
            type: string;
            text: string;
        };
        card: {
            content: string;
            title: string;
            type: 'Simple';
        };
        shouldEndSession: boolean;
        reprompt?: {
            outputSpeech: {
                type: string;
                ssml: string;
            };
        };
        directives?: {
            type: 'Dialog.ElicitSlot';
            updatedIntent: {
                name: 'queryIntent';
                confirmationStatus: 'NONE';
                slots: {
                    query: {
                        name: 'query';
                        value: '';
                        confirmationStatus: 'NONE';
                    };
                };
            };
            slotToElicit: 'query';
        }[];
    };
};

type AlexaCustomSession = {
    sessionId: string;
};
type AlexaCustomRequest = {
    session: AlexaCustomSession;
};

type StoredSession = {
    request: AlexaCustomRequest | null;
    isV2Skill?: boolean;
    responseTimer: NodeJS.Timeout | null;
    callback: ((response: AlexaCustomResponse) => void) | null;
};

export default class AlexaCustom {
    private lang: ioBroker.Languages = 'de';
    private openSessions: {
        [sessionId: string]: StoredSession;
    } = {};

    private knownDevices: {
        [deviceId: string]: {
            id: string;
            room: `enum.room.${string}`;
            lastSeen: number;
        };
    } = {};
    private knownUsers: {
        [deviceId: string]: {
            id: string;
            name: string;
            lastSeen: number;
        };
    } = {};
    private lastSkillRequestWasV2 = false;
    private config: IotAdapterConfig;
    private adapter: ioBroker.Adapter;

    constructor(adapter: ioBroker.Adapter) {
        this.config = adapter.config as IotAdapterConfig;
        this.adapter = adapter;
        if (this.config.customKnownAlexaDevices && Array.isArray(this.config.customKnownAlexaDevices)) {
            this.config.customKnownAlexaDevices.forEach(device => {
                this.knownDevices[device.id] = device;
                // {
                //     "id": "amzn1.ask.device.XXXXXXXXX", // just show last X chars in UI, should be unique enough
                //     "room": "enum.room.xyz",
                //     "lastSeen": 1234567899,
                // }
            });
        }
        if (this.config.customKnownAlexaUsers && Array.isArray(this.config.customKnownAlexaUsers)) {
            this.config.customKnownAlexaUsers.forEach(device => {
                this.knownUsers[device.id] = device;
                // {
                //     "id": "amzn1.ask.account.XXXXXXXXX", // just show last X chars in UI, should be unique enough
                //     "name": "Holger",
                //     "lastSeen": 1234567899,
                // }
            });
        }
    }

    getKnownDevices(): {
        id: string;
        room: `enum.room.${string}`;
        lastSeen: number;
    }[] {
        return Object.values(this.knownDevices);
    }

    getKnownUsers(): {
        id: string;
        name: string;
        lastSeen: number;
    }[] {
        return Object.values(this.knownUsers);
    }

    // eslint-disable-next-line no-unused-private-class-members
    #writeResponse(_channelId: string, _stateId: string, _command: string, _value: ioBroker.StateValue): void {
        // adapter.log.warn('[CUSTOM] Unknown applianceId: ' + deviceId);
    }

    #getResponseV1(text: string, repromptText: string | null, shouldEndSession?: boolean): AlexaCustomResponse {
        let speechPlainText = text;
        let speechType = 'PlainText';
        if (text.startsWith('<speak>')) {
            speechPlainText = text.replace(/<[^>]*>/g, '').trim();
            speechType = 'SSML';
        }

        let repromptType = 'PlainText';
        if (repromptText?.startsWith('<speak>')) {
            repromptType = 'SSML';
        }

        const response: AlexaCustomResponse = {
            version: '1.0',
            sessionAttributes: {},
            response: {
                outputSpeech: {
                    type: speechType,
                    text: text,
                },
                card: {
                    content: speechPlainText,
                    title: textsT(this.lang, 'Answer from ioBroker') || 'ioBroker',
                    type: 'Simple',
                },
                shouldEndSession: shouldEndSession || false,
            },
        };
        if (repromptText) {
            response.response.reprompt = {
                outputSpeech: {
                    type: repromptType,
                    ssml: repromptText,
                },
            };
        }
        return response;
    }

    #getResponseV2(text: string, repromptText: string | null, shouldEndSession?: boolean): AlexaCustomResponse {
        const response = this.#getResponseV1(text, repromptText, shouldEndSession);

        if (!shouldEndSession) {
            // We redirect the user to the Dialog Intent to capture the full traffic
            response.response.directives = [
                {
                    type: 'Dialog.ElicitSlot',
                    updatedIntent: {
                        name: 'queryIntent',
                        confirmationStatus: 'NONE',
                        slots: {
                            query: {
                                name: 'query',
                                value: '',
                                confirmationStatus: 'NONE',
                            },
                        },
                    },
                    slotToElicit: 'query',
                },
            ];
        }
        return response;
    }

    setLanguage(_lang: ioBroker.Languages): void {
        this.lang = _lang || 'de';
    }

    setResponse(resp: string, shouldEndSession?: boolean): void {
        let response: {
            sessionId: string;
            responseText: string;
            shouldEndSession: boolean;
        } | null = null;
        if (resp.startsWith('{') && resp.endsWith('}')) {
            try {
                response = JSON.parse(resp);
            } catch {
                // ignore
            }
        }
        let session: StoredSession | undefined;
        let sessionId: string | undefined;
        if (response !== null && typeof response === 'object') {
            if (response.sessionId) {
                sessionId = response.sessionId;
                session = this.openSessions[sessionId];
            }
        }
        // We got a state response without session reference
        if (!session) {
            const sessions = Object.keys(this.openSessions).filter(
                sessionId => !!(this.openSessions[sessionId].responseTimer && this.openSessions[sessionId].callback),
            );
            if (sessions.length > 0) {
                sessionId = sessions[0];
                session = this.openSessions[sessionId];
                if (sessions.length > 1) {
                    this.adapter.log.warn(
                        '[CUSTOM] More than one session with expected responses ... consider the first one as the relevant one',
                    );
                }
            }
        }

        const obj = {
            responseText: '',
            shouldEndSession: shouldEndSession === undefined ? !sessionId : shouldEndSession,
        };
        if (response !== null && typeof response === 'object') {
            if (response.responseText) {
                obj.responseText = response.responseText;
            }
            if (response.shouldEndSession !== undefined) {
                obj.shouldEndSession = response.shouldEndSession;
            }
        } else {
            obj.responseText = resp;
        }

        if (session?.responseTimer && session.callback) {
            this.processAfter(session.request, obj.responseText, obj.shouldEndSession, session.callback);
        }
    }

    processAfter(
        request: {
            session: {
                sessionId: string;
            };
        },
        text: string,
        shouldEndSession: boolean | undefined,
        callback: (response: AlexaCustomResponse) => void,
    ): void {
        void this.adapter.setState('smart.lastResponse', text, true);

        const sessionId = request.session && request.session.sessionId ? request.session.sessionId : '';

        if (this.openSessions[sessionId].responseTimer) {
            clearTimeout(this.openSessions[sessionId].responseTimer);
            this.openSessions[sessionId].responseTimer = null;
        }

        this.openSessions[sessionId].callback = null;
        this.openSessions[sessionId].request = null;

        const isV2Skill =
            this.openSessions[sessionId].isV2Skill !== undefined
                ? this.openSessions[sessionId].isV2Skill
                : !!request.this.customSkillV2;
        if (isV2Skill) {
            callback(this.#getResponseV2(text, null, shouldEndSession));
        } else {
            callback(this.#getResponseV1(text, null, shouldEndSession));
        }
    }

    touchSession(sessionId, isV2Skill) {
        if (openSessions[sessionId] && openSessions[sessionId].expiryTimer) {
            clearTimeout(openSessions[sessionId].expiryTimer);
            openSessions[sessionId].expiryTimer = null;
        }
        openSessions[sessionId] = openSessions[sessionId] || {
            expiryTimer: null,
            responseTimer: null,
            request: null,
            callback: null,
            isV2Skill,
        };
        openSessions[sessionId].expiryTimer = setTimeout(() => {
            delete openSessions[sessionId];
        }, 60000); // latest after 10 mins we declare a session as closed
    }

    deleteSession(sessionId) {
        if (openSessions[sessionId] && openSessions[sessionId].expiryTimer) {
            clearTimeout(openSessions[sessionId].expiryTimer);
        }
        delete openSessions[sessionId];
    }

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
    async process(request, isEnabled) {
        if (!request || !request.request) {
            adapter.log.error('Invalid request: no intent!');
            return { error: 'Invalid request: no intent!' };
        }
        const isV2Skill = !!request.customSkillV2;
        lastSkillRequestWasV2 = isV2Skill;
        const getResponse = isV2Skill ? getResponseV2 : getResponseV1;

        if (!isEnabled) {
            if (lang === 'en') {
                return getResponse(
                    'The service is not activated. Please enable Alexa integration in the iot Adapter.',
                    true,
                );
            } else if (lang === 'ru') {
                return getResponse(
                    'Услуга не активирована. Включите интеграцию Alexa в адаптере Интернета вещей.',
                    true,
                );
            } else {
                return getResponse(
                    'Der Service ist nicht aktiviert. Bitte aktiviere die Alex-Integration im iot-Adapter um Ihn zu aktivieren.',
                    true,
                );
            }
        }

        const sessionId = request.session && request.session.sessionId ? request.session.sessionId : '';
        adapter.log.debug(
            `Custom Skill ${isV2Skill ? 'V2' : 'V1'} request: ${request.request.type}/${request.request.intent && request.request.intent.name} for session ${sessionId}, dialog: ${request.request.dialogState}`,
        );

        if (request.request.type === 'LaunchRequest') {
            adapter.log.debug(request.request.type);
            this.touchSession(sessionId, isV2Skill);
            if (lang === 'en') {
                return getResponse(
                    'Hello, what do you want to know or control?',
                    'What do you want to know or control?',
                );
            } else if (lang === 'ru') {
                return getResponse(
                    'Привет. Что вы хотите знать или контролировать?',
                    'Что вы хотите знать или контролировать?',
                );
            } else {
                return getResponse(
                    'Hallo, was möchtest Du wissen oder steuern?',
                    'Was möchtest Du wissen oder steuern?',
                );
            }
        } else if (request.request.type === 'IntentRequest') {
            if (request.request.intent) {
                this.touchSession(sessionId, isV2Skill);

                if (request.request.intent.name === 'AMAZON.HelpIntent') {
                    if (lang === 'en') {
                        return getResponse(
                            'This skill will pass all recognized words to your ioBroker installation and you can configure actions and responses there! What do you want to know or control?',
                            'What do you want to know or control?',
                        );
                    } else if (lang === 'ru') {
                        return getResponse(
                            'Этот навык передаст все распознанные слова в вашу установку ioBroker, и вы сможете настроить действия и ответы там! Что вы хотите знать или контролировать?',
                            'Что вы хотите знать или контролировать?',
                        );
                    } else {
                        return getResponse(
                            'Dieser Skill gibt alle erkannten Wörter an Deine ioBroker-Installation weiter und Du kannst dort Aktionen und Antworten konfigurieren! Was möchtest Du wissen oder steuern?',
                            'Was möchtest Du wissen oder steuern?',
                        );
                    }
                } else if (
                    request.request.intent.name === 'AMAZON.CancelIntent' ||
                    request.request.intent.name === 'AMAZON.StopIntent'
                ) {
                    adapter.log.debug(request.request.intent.name);
                    this.deleteSession(sessionId);
                    if (lang === 'en') {
                        return getResponse('Goodbye!', true);
                    } else if (lang === 'ru') {
                        return getResponse('До скорого!', true);
                    } else {
                        return getResponse('Bis bald!', true);
                    }
                } else {
                    let textsLog = [];
                    let texts = [];

                    const originalIntentName = request.request.intent.name;
                    if (request.request.intent.name === 'AMAZON.YesIntent') {
                        // Only relevant for v2 Skill. Convert an initial YesIntent to Words
                        if (lang === 'en') {
                            textsLog.push('AMAZON.YesIntent = Yes');
                            texts.push('Yes');
                        } else if (lang === 'ru') {
                            textsLog.push('AMAZON.YesIntent = Да');
                            texts.push('Да');
                        } else if (lang === 'de') {
                            textsLog.push('AMAZON.YesIntent = Ja');
                            texts.push('Ja');
                        }
                    } else if (request.request.intent.name === 'AMAZON.NoIntent') {
                        // Only relevant for v2 Skill. Convert an initial NoIntent to Words
                        if (lang === 'en') {
                            textsLog.push('AMAZON.NoIntent = No');
                            texts.push('No');
                        } else if (lang === 'ru') {
                            textsLog.push('AMAZON.NoIntent = Нет');
                            texts.push('Нет');
                        } else if (lang === 'de') {
                            textsLog.push('AMAZON.NoIntent = Nein');
                            texts.push('Nein');
                        }
                    } else if (request.request.intent.name.startsWith('queryIntent')) {
                        // v2 Skill
                        // Only relevant for v2 Skill, get the start words out of the intent name
                        const startWords = request.request.intent.name
                            .replace(/^queryIntent/, '')
                            .replace(/ae/, 'ä')
                            .replace(/oe/, 'ö')
                            .replace(/ue/, 'ü')
                            .replace(/Oe/, 'Ö')
                            .replace(/Ue/, 'Ü')
                            .replace(/Ae/, 'Ä')
                            .replace(/ss/, 'ß')
                            .replace(/([A-Z])/g, ' $1')
                            .trim();
                        request.request.intent.name = 'queryIntent';
                        if (startWords.length && startWords !== 'FillWords') {
                            // ignore FillWords
                            textsLog.push(`queryIntent = ${startWords}`);
                            texts.push(startWords);
                        }
                    }

                    if (!request.request.intent.slots && textsLog.length === 0) {
                        // No slots and nothing from above
                        adapter.log.warn(`Unexpected ALEXA Request: ${JSON.stringify(request)}`);
                        if (lang === 'en') {
                            return getResponse('I did not hear you. Please repeat your question!');
                        } else if (lang === 'ru') {
                            return getResponse('Я не слышал тебя. Пожалуйста, повторите свой вопрос!');
                        } else {
                            return getResponse('Ich habe Dich nicht verstanden. Bitte wiederhole deine Frage!');
                        }
                    }

                    // collect all filled slots (v1 and v2 skill)
                    if (request.request.intent.slots) {
                        let slots = Object.keys(request.request.intent.slots);
                        slots.forEach(slotId => {
                            const slot = request.request.intent.slots[slotId];
                            let value = slot.value;
                            let resolution =
                                slot.resolutions &&
                                slot.resolutions.resolutionsPerAuthority &&
                                slot.resolutions.resolutionsPerAuthority.length > 0
                                    ? slot.resolutions.resolutionsPerAuthority[0]
                                    : null;

                            if (resolution && resolution.status.code === 'ER_SUCCESS_MATCH') {
                                let resolutionValue = resolution.values[0].value;
                                value = resolutionValue.name;
                            }

                            if (value && value.length) {
                                texts.push(value);
                                textsLog.push(`${slotId} = ${value}`);
                            }
                        });
                    }

                    let text = texts.join(' ');

                    const intent = request.request.intent.name || '';
                    if (originalIntentName.startsWith('queryIntentStarteDialog')) {
                        // v2 Skill StarteDialog* intents are automatically handled without sending anywhere
                        let response = '';
                        if (originalIntentName === 'queryIntentStarteDialog') {
                            // Intent to directly redirect to the dialog state without further processing
                            response = text.replace(/^Starte Dialog /, '').trim();
                        } else if (originalIntentName === 'queryIntentStarteDialogMitFrage') {
                            // Intent to directly redirect to the dialog state with asking a question without further processing
                            response = text.replace(/^Starte Dialog Mit Frage /, '').trim();
                            if (response.length) {
                                response += '?';
                            }
                        }
                        if (!response.length) {
                            // We need to send an answer, else it is an error
                            if (lang === 'en') {
                                response = 'Yes?';
                            } else if (lang === 'ru') {
                                response = 'Да?';
                            } else {
                                response = 'Ja?';
                            }
                        }
                        return getResponse(response, response);
                    } else if (intent === 'queryIntent' && stopPhrases[lang].includes(text.toLowerCase())) {
                        // v2 Skill when in dialog mode we need to take care of the exit criteria ourselves
                        this.deleteSession(sessionId);

                        if (lang === 'en') {
                            return getResponse('Goodbye!', true);
                        } else if (lang === 'ru') {
                            return getResponse('До скорого!', true);
                        } else {
                            return getResponse('Bis bald!', true);
                        }
                    } else {
                        // v1 and v2 Skill
                        const deviceId =
                            request.context &&
                            request.context.System &&
                            request.context.System.device &&
                            request.context.System.device.deviceId
                                ? request.context.System.device.deviceId
                                : '';
                        const deviceRoom = knownDevices[deviceId] ? knownDevices[deviceId].room : undefined;
                        const userId =
                            request.session && request.session.user && request.session.user.userId
                                ? request.session.user.userId
                                : '';
                        const userName = knownUsers[userId] ? knownUsers[userId].name : undefined;
                        const commandObj = {
                            words: texts,
                            intent: intent,
                            deviceId,
                            deviceRoom,
                            sessionId,
                            userId,
                            userName,
                        };

                        // Add room and username to the text if configured
                        if (deviceRoom && config.addCustomKnownAlexaDeviceRoomToText) {
                            text += ` ${deviceRoom}`;
                        }
                        if (userName && config.addCustomKnownAlexaUserNameToText) {
                            text += ` ${userName}`;
                        }

                        // Add intent in front of the text to stay compatible with v1 Skill
                        text = `${intent} ${text}`;
                        text = text.trim();

                        await adapter.setStateAsync('smart.lastCommand', text, true);
                        await adapter.setStateAsync('smart.lastCommandObj', JSON.stringify(commandObj), true);

                        adapter.log.debug(`${intent}: ${textsLog.join(', ')}`);

                        if (intent) {
                            let text_timeout;
                            if (lang === 'en') {
                                text_timeout = `Processing of ${text} is not possible!`;
                            } else if (lang === 'ru') {
                                text_timeout = `Обработка ${text} не возможна!`;
                            } else {
                                text_timeout = `Die Verarbeitung von ${text} ist nicht möglich!`;
                            }

                            if (
                                config.text2command !== null &&
                                config.text2command !== undefined &&
                                config.text2command !== ''
                            ) {
                                const state = await adapter.getForeignStateAsync(
                                    `system.adapter.text2command.${config.text2command}.alive`,
                                );
                                if (state && state.val) {
                                    return new Promise(resolve => {
                                        openSessions[sessionId].responseTimer = setTimeout(() => {
                                            openSessions[sessionId].responseTimer = null;
                                            if (resolve) {
                                                this.processAfter(request, text_timeout, true, resolve);
                                                resolve = null;
                                            }
                                        }, 1000);

                                        if (config.language) {
                                            text = `${config.language};${text}`;
                                        }

                                        adapter.sendTo(`text2command.${config.text2command}`, text, result => {
                                            if (openSessions[sessionId].responseTimer) {
                                                clearTimeout(openSessions[sessionId].responseTimer);
                                                openSessions[sessionId].responseTimer = null;
                                            }
                                            const regExp = new RegExp(`"${intent.toLowerCase()}\\s`);
                                            result.response = result.response
                                                .replace(/^\w\w;/, '')
                                                .replace(regExp, '"');
                                            adapter.log.debug(`Response from text2command: ${result.response}`);

                                            adapter.setState('smart.lastResponse', result.response, true);
                                            if (resolve) {
                                                resolve(getResponse(result.response, true));
                                                resolve = null;
                                            }
                                        });
                                    });
                                }
                            }

                            return new Promise(resolve => {
                                openSessions[sessionId].responseTimer &&
                                    clearTimeout(openSessions[sessionId].responseTimer);
                                openSessions[sessionId].callback = resolve;
                                openSessions[sessionId].request = request;

                                openSessions[sessionId].responseTimer = setTimeout(
                                    () => this.processAfter(request, text_timeout, true, resolve),
                                    200,
                                );
                            });
                        } else {
                            if (lang === 'en') {
                                return getResponse('I did not understand the question!');
                            } else if (lang === 'ru') {
                                return getResponse('Я не поняла ваш вопрос!');
                            } else {
                                return getResponse('Ich habe Deine Frage nicht verstanden!');
                            }
                        }
                    }
                }
            } else {
                adapter.log.warn(`Unexpected ALEXA Request: ${JSON.stringify(request)}`);
                if (lang === 'en') {
                    return getResponse('Please repeat your question!');
                } else if (lang === 'ru') {
                    return getResponse('Пожалуйста, повторите вопрос!');
                } else {
                    return getResponse('Bitte wiederhole die Frage!');
                }
            }
        } else if (request.request.type === 'SessionEndedRequest') {
            adapter.log.debug(`SessionEndedRequest: ${request.request.reason}`);
            this.deleteSession(sessionId);
            // Should not be called
            return {};
        }
    }
}
