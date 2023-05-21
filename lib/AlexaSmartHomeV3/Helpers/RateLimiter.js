const path = require('path');
const HourlyDeviceRateLimitExceeded = require('../Exceptions/HourlyDeviceRateLimitExceeded');
const OverallDailyRateLimitExceeded = require('../Exceptions/OverallDailyRateLimitExceeded');
const FileHelper = require('./FileHelper');
const Utils = require('./Utils');

class RateLimiter {
    static MAX_DEVICE_STATE_CHANGES_PER_HOUR = 60;
    static MAX_CHANGES_PER_DAY = 1000;
    static USAGE_STORAGE_FOLDER = 'usage';
    static USAGE_STORAGE_FILE_NAME = 'usage.json';

    static usage = new Map();

    static async init() {
        try {
            await FileHelper.createFolder(FileHelper.absolutePath(this.USAGE_STORAGE_FOLDER));
            const raw = await FileHelper.read(this.storageFileName);
            this.usage = JSON.parse(raw, this.reviver);
            Array.from(this.usage, ([key, value]) => value.timestamp = new Date(value.timestamp));
        } catch (error) {
            // nop
            this.usage = new Map();
        }
    }

    static get storageFileName() {
        return FileHelper.absolutePath(path.join(this.USAGE_STORAGE_FOLDER, this.USAGE_STORAGE_FILE_NAME));
    }

    static async store() {
        try {
            await FileHelper.write(this.storageFileName, JSON.stringify(this.usage, this.replacer));
        } catch (error) {
            // nop
        }
    }

    static replacer(key, value) {
        if (value instanceof Map) {
            return {
                _type: 'map',
                map: Array.from(value.entries()),
            }
        } else return value;
    }

    static reviver(key, value) {
        if (value._type === 'map') {
            return new Map(value.map);
        } else {
            return value;
        }
    }

    static get(endpointId) {
        let item = this.usage.get(endpointId);
        if (!item) {
            item = {
                changeCounter: 0,
                timestamp: Utils.currentHour()
            }
            this.usage.set(endpointId, item);
        }
        return item;
    }

    static incrementAndGet(endpointId) {
        let item = this.get(endpointId);

        if (!Utils.isCurrentHour(item.timestamp)) {
            item.changeCounter = 1;
            item.timestamp = Utils.currentHour();
        } else {
            item.changeCounter += 1;
        }

        this.usage.set(endpointId, item);

        // intentionally not waiting for the promise to be resolved
        this.store()
            .catch(e => console.error(`Cannot store usage data: ${e}`));

        if (item.changeCounter > this.MAX_DEVICE_STATE_CHANGES_PER_HOUR) {
            throw new HourlyDeviceRateLimitExceeded(`Hourly state change limit for ${endpointId} exceeded`)
        }

        const changesToday = Array.from(this.usage.values()).filter(item => Utils.isToday(item.timestamp)).reduce((sum, { changeCounter }) => sum + changeCounter, 0);

        if (changesToday > this.MAX_CHANGES_PER_DAY) {
            throw new OverallDailyRateLimitExceeded(`Overall daily state change limit exceeded`);
        }

        return item;
    }

}

module.exports = RateLimiter;