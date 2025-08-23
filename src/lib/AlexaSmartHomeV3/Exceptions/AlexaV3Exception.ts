export default class AlexaV3Exception extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
