const HourlyDeviceRateLimitExceeded = require("../Exceptions/HourlyDeviceRateLimitExceeded");
const OverallDailyRateLimitExceeded = require("../Exceptions/OverallDailyRateLimitExceeded");
const Utils = require("./Utils");

class RateLimiter {
    static MAX_DEVICE_STATE_CHANGES_PER_HOUR = 60;
    static MAX_CHANGES_PER_DAY = 1000;
    static usage = new Map();

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

        if (item.changeCounter > this.MAX_DEVICE_STATE_CHANGES_PER_HOUR) {
            throw new HourlyDeviceRateLimitExceeded(`Hourly state change limit for ${endpointId} exceeded`)
        }

        const changesToday = Array.from(this.usage.values()).filter(item => Utils.isToday(item.timestamp)).reduce((sum, { changeCounter }) => sum + changeCounter, 0);

        if (changesToday > this.MAX_CHANGES_PER_DAY) {
            throw new OverallDailyRateLimitExceeded(`Overall daily state change limit exceeded`)
        }

        return item;
    }

}

module.exports = RateLimiter;