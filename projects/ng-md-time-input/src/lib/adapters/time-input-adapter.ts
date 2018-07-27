export interface TimeInputAdapter<T> {
    /**
     * Creates a copy of the given object.
     * @param object The object to clone.
     */
    clone(object: T): T;

    /**
     * Factory method to create new object of type T.
     * @param days The number of days to include in the temporal object.
     * @param hours The number of hours to include in the temporal object.
     * @param minutes The number of minutes to include in the temporal object.
     */
    create(days: number, hours: number, minutes: number): T;

    /**
     * Creates a new temporal object from the given object and sets the time
     * to the given values.
     * @param object The temporal object used to create the new temporal object.
     * @param days The number of days to set.
     * @param hours The number of hours to set.
     * @param minutes The number of minutes to set.
     */
    createFrom(object: T, days: number, hours: number, minutes: number): T;

    /**
     * Tests if the given object has the right type.
     * @param object The object to test.
     */
    isValid(object: T): boolean;

    /**
     * Returns the total number of days in the temporal object. This number
     * is an integer. It is not a floating point number.
     * Note: It includes the number of months. Ex. If the object has
     * a month, 3 days and 5 hours, it will return 33 or 34, depending on the month.
     * @param object The temporal object from which we get the number of days.
     */
    asDays(object: T): number;

    /**
     * Returns the exact number of hours in the temporal object. This number
     * is an integer. Note: It only considers the hour part of the object.
     * Ex. If the object has a day, 5 hours and 10 minutes, it will return 5.
     * @param object The temporal object from which we get the number of hours.
     */
    getHours(object: T): number;

    /**
     * Returns the exact number of minutes in the temporal object. This number
     * is an integer. Note: It only considers the minute part of the object.
     * Ex. If the object has an hour, 10 minutes and 41 seconds, it will return 10.
     * @param object The temporal object from which we get the number of hours.
     */
    getMinutes(object: T): number;

    /**
     * Gets the maximum time for the given temporal object. This maximum time
     * is capped to days if withDays is true, capped to hours otherwise.
     * @param object The temporal object from which we get the maximum time.
     * @param withDays true if the max time includes the days, false if it is
     * capped to hours and minutes.
     */
    getMaxTimeInMinutes(object: T, withDays: boolean): number;

    /**
     * Gets the minimum time for the given temporal object. This minimum time
     * is capped to days if withDays is true, capped to hours otherwise.
     * @param object The temporal object from which we get the minimum time.
     * @param stopAtDay true if we're not allowed to change the days, false otherwise
     * (still not allowed to change the month). This param is only useful for times, not durations.
     */
    getMinTimeInMinutes(object: T, stopAtDay: boolean): number;
}
