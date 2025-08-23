export interface IotAdapterConfig {
    login: string;
    pass: string;
    language: ioBroker.Languages;
    cloudUrl: 'a18wym7vjdl22g.iot.eu-west-1.amazonaws.com';
    functionFirst: boolean;
    concatWord: string;
    responseOID: string;
    restartOnDisconnect: boolean;
    iftttKey: string;
    replaces: string;
    amazonAlexa: boolean;
    amazonAlexaV3: boolean;
    amazonAlexaBlood: string;
    amazonAlexaBloodShortAnswer: boolean;
    googleHome: boolean;
    yandexAlisa: boolean;
    allowedServices: string;
    text2command: `${number}`;
    nightscout: string;
    nightscoutPass: string;
    noCommon: boolean;
    debug: boolean;
    remote: boolean;
    defaultToggle: boolean;
    remoteAdminInstance: `${string}.${number}`;
    remoteWebInstance: `${string}.${number}`;
    customKnownAlexaUsers: {
        id: string;
        name: string;
        lastSeen: number;
    }[];
    addCustomKnownAlexaUserNameToText: boolean;
    customKnownAlexaDevices: {
        id: string;
        room: 'enum.room.${string}';
        lastSeen: number;
    }[];
    addCustomKnownAlexaDeviceRoomToText: boolean;
    collectStatesMs?: number | string;
    collectObjectsMs?: number | string;
    collectLogsMs?: number | string;
}
