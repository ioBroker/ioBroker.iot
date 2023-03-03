class Device {
    constructor(smartName, lang) {
        this.room = null
        this.function = null
        this.smartName = smartName
        this.lang = lang
        this.friendlyName = null
        this.byON = ''
        this.smartType = null
    }

    assignRoom(roomName) {
        if (roomName && typeof roomName === 'object') {
            this.room = roomName[this.lang] || roomName.en;
        } else {
            this.room = roomName
        }
    }

    assignFunction(functionName) {
        if (functionName && typeof functionName === 'object') {
            this.func = functionName[this.lang] || functionName.en;
        } else {
            this.func = functionName
        }
    }

    name() {
        if (this.friendlyName) {
            return this.friendlyName;
        }
        this.friendlyName = this.smartName;

        // due to historical reasons, the smartName might be an object, containing among other things, also byON name, friendly name and smart type
        if (this.smartName && typeof this.smartName === 'object') {
            this.byON = this.smartName.byON;
            this.smartType = this.smartName.smartType;
            this.friendlyName = this.smartName[this.lang] || this.smartName.en;
        }





    }




}

module.exports = Device;