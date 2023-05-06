class AlexaV3Exception extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

module.exports = AlexaV3Exception;