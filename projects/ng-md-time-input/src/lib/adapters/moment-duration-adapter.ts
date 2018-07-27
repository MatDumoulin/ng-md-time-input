// Moment
import { Duration, duration, isDuration } from "moment";
import { TimeInputAdapter } from "./time-input-adapter";

export class MomentDurationAdapter implements TimeInputAdapter<Duration> {
    private readonly NUMBER_OF_MINUTES_IN_HOUR = 60;
    private readonly NUMBER_OF_MINUTES_IN_DAY = 1440;

    constructor() {

    }

    clone(object: Duration): Duration {
        return object.clone();
    }

    /**
     * Factory method to create new object of type T.
     * @param days The number of days to include in the temporal object.
     * @param hours The number of hours to include in the temporal object.
     * @param minutes The number of minutes to include in the temporal object.
     */
    create(days: number, hours: number, minutes: number): Duration {
        return duration({days, hours, minutes});
    }

    /**
     * Creates a new temporal object from the given object and sets the time
     * to the given values.
     * @param object The temporal object used to create the new temporal object.
     * @param days The number of days to set.
     * @param hours The number of hours to set.
     * @param minutes The number of minutes to set.
     */
    createFrom(object: Duration, days: number, hours: number, minutes: number): Duration {
        // The duration object does not need anything from the old object.
        if(days === null) {
            days = 0;
        }

        return this.create(days, hours, minutes);
    }

    /**
     * Tests if the given object has the right type.
     * @param object The object to test.
     */
    isValid(object: Duration): boolean {
        return isDuration(object);
    }

    /**
     * Returns the total number of days in the temporal object. This number
     * is an integer. It is not a floating point number.
     * Note: It includes the number of months. Ex. If the object has
     * a month, 3 days and 5 hours, it will return 33 or 34, depending on the month.
     * @param object The temporal object from which we get the number of days.
     */
    asDays(object: Duration): number {
        return Math.floor(object.asDays());
    }

    /**
     * Returns the exact number of hours in the temporal object. This number
     * is an integer. Note: It only considers the hour part of the object.
     * Ex. If the object has a day, 5 hours and 10 minutes, it will return 5.
     * @param object The temporal object from which we get the number of hours.
     */
    getHours(object: Duration): number {
        return object.hours();
    }

    /**
     * Returns the exact number of minutes in the temporal object. This number
     * is an integer. Note: It only considers the minute part of the object.
     * Ex. If the object has an hour, 10 minutes and 41 seconds, it will return 10.
     * @param object The temporal object from which we get the number of hours.
     */
    getMinutes(object: Duration): number {
        return object.minutes();
    }


    getMaxTimeInMinutes(object: Duration, withDays: boolean): number {
        if (object && this.isValid(object)) {
            const maxDaysInMinutes = withDays ? 99 * this.NUMBER_OF_MINUTES_IN_DAY : 0;
            const maxHoursInMinutes = 23 * this.NUMBER_OF_MINUTES_IN_HOUR;
            const maxMinutes = 59;

            return maxDaysInMinutes + maxHoursInMinutes + maxMinutes;
        }

        return 0;
    }

    getMinTimeInMinutes(object: Duration, stopAtDay: boolean): number {
        return 0;
    }
}
