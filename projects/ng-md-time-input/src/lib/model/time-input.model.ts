import { Duration,  Moment, isMoment, isDuration } from "moment";
import { MomentDurationAdapter, MomentTimeAdapter, TimeInputAdapter } from "../adapters";

export interface TemporalObjectDescriptor {
    daysDecimal: boolean;
    days: boolean;
    hoursDecimal: boolean;
    hours: boolean
    minutesDecimal: boolean;
    minutes: boolean;
}

/**
 * This class handles all of the time adapters manipulation. It acts
 * as the model for the time input. That way, the component only has
 * to handle the view manipulations.
 **/
 export class TimeInputModel {
    private readonly NUMBER_OF_MINUTES_IN_HOUR = 60;
    private readonly NUMBER_OF_MINUTES_IN_TEN_HOURS = 600;
    private readonly NUMBER_OF_MINUTES_IN_DAY = 1440;
    private readonly MAX_TIME_WITH_DAYS = 143999; // 99d 23:59
    private _temporalObject: Duration | Moment | Date;
    private _temporalObjectAdapter: TimeInputAdapter<Moment | Duration | Date> = new MomentDurationAdapter();
    private _maxTimeInMinutes = this.MAX_TIME_WITH_DAYS; // 99d 23:59
    private _minTimeInMinutes = 0;
    // The original time is kept to be complient with the initial value
    // that was given to this input. Since we don't handle the years and
    // months, we don't want to change these values when changer the time.
    private _originalTemporalObject: Duration | Moment | Date;
    // Wheter we want to update the days from the given time or not.
    private _handleDays = true;

    /**
     * Sets the value of the model to the given string values.
     * If any param is an empty string, this param won't change the model.
     * @param daysString The number of days to set.
     * @param hoursString The number of hours to set.
     * @param minutesString The number of minutes to set.
     */
    updateTime(daysString: string, hoursString: string, minutesString: string): void {
        // First of, we parse the strings to number in order to validate if they are numbers.
        let days = parseInt(daysString, 10);
        let hours = parseInt(hoursString, 10);
        let minutes = parseInt(minutesString, 10);

        // The strings can be NaN if they are empty, null, undefined or contain a letter.
        if (
            Number.isNaN(days) &&
            Number.isNaN(hours) &&
            Number.isNaN(minutes)
        ) {
            this._temporalObject = null;
        } else {
            days = Number.isNaN(days) ? 0 : days;
            hours = Number.isNaN(hours) ? 0 : hours;
            minutes = Number.isNaN(minutes) ? 0 : minutes;

            this.setTemporalValue(days, hours, minutes);
        }
    }

    getTemporalObject(): Duration | Moment | Date {
        return this._temporalObject;
    }

    /**
     * Initializes the temporal object and adapter to use in this model.
     * The temporal object will be changed
     * @param object The temporal object to use as the current one. If is falsy, set it to null.
     * @param temporalObjectAdapter The adapter to use with this temporal object.
     * this is mostly useful when the given temporal object is null since we need
     * to know the desired type of temporal object to create when the user changes
     * the time value in the input. If the adapter is not specified, we will infer
     * the proper adapter to use from the given temporal object. The adapter defaults
     * to MomentDurationAdapter if not specified and object is null.
     */
    setTemporalObject(object: Duration | Moment | Date, temporalObjectAdapter ?: TimeInputAdapter<Duration | Moment | Date>) {
        if(object) {
             if(!temporalObjectAdapter) {
                this.inferAdapterFromTemporalObject(object);
            }
            else {
                this._temporalObjectAdapter = temporalObjectAdapter;
            }

            this._temporalObject = this._temporalObjectAdapter.clone(object);
            this._originalTemporalObject = object;
        }
        else {
            // If no adapter was specified yet, set it to a default value.
            if(!this._temporalObjectAdapter) {
                this._temporalObjectAdapter = new MomentDurationAdapter();
            }
            this._temporalObject = null;
            this._originalTemporalObject = null;
        }

        this.updateMaxTime();
        this.updateMinTime();
    }

    setTemporalValue(days: number, hours: number, minutes: number) {
        const timeInMinutes =
            days * this.NUMBER_OF_MINUTES_IN_DAY +
            hours * this.NUMBER_OF_MINUTES_IN_HOUR +
            minutes;
        let adaptedDays = this._handleDays ? 0 : null;
        // If the time is greater than the max time, set it to the max time.
        if (timeInMinutes > this._maxTimeInMinutes) {
            this._temporalObject = this.createNewTemporalObject(
                this._originalTemporalObject,
                adaptedDays,
                0,
                this._maxTimeInMinutes
            );
        }
        // Else, if the time is negative, set it to 0.
        else if (timeInMinutes < this._minTimeInMinutes) {
            this._temporalObject = this.createNewTemporalObject(this._originalTemporalObject, adaptedDays, 0, this._minTimeInMinutes);
        } else {
            adaptedDays = this._handleDays ? days : null;
            this._temporalObject = this.createNewTemporalObject(
                this._originalTemporalObject,
                adaptedDays,
                hours,
                minutes
            );
        }
    }

/*     restoreOriginalTemporalObject() {
        if(!this._originalTemporalObject || !this._temporalObjectAdapter) {
            throw new Error("There must be an original temporal object in order to restore it.");
        }

        this._temporalObject = this._temporalObjectAdapter.clone(this._originalTemporalObject);
    } */

    /**
     * Increments the time value at the given index.
     * @param actionDescriptor Defines which fields to increment.
     */
    incrementTime(actionDescriptor: Partial<TemporalObjectDescriptor>) {
        if (!this._temporalObject) {
            // Setting the time value to the minimum while keeping the data of the original time.
            this._temporalObject = this.createNewTemporalObject(this._originalTemporalObject, 0, 0, this._minTimeInMinutes);
        } else {
            let days = this._temporalObjectAdapter.asDays(this._temporalObject);
            let hours = this._temporalObjectAdapter.getHours(this._temporalObject);
            let minutes = this._temporalObjectAdapter.getMinutes(this._temporalObject);
            // Defining the increment/decrement step.
            if(actionDescriptor.minutes) {
                minutes += 1;
            }
            if(actionDescriptor.minutesDecimal) {
                minutes += 10;
            }
            if(actionDescriptor.hours) {
                hours += 1;
            }
            if(actionDescriptor.hoursDecimal) {
                hours += this.getHoursDecimalIncrementStep();
            }
            if(actionDescriptor.days) {
                days += 1;
            }
            if(actionDescriptor.daysDecimal) {
                days += 10;
            }

            days = this.handleDays ? days : 0;
            this.setTemporalValue(days, hours, minutes);
        }
    }

    /**
     * Decrements the time value at the given index.
     * @param actionDescriptor Defines which fields to decrement.
     */
    decrementTime(actionDescriptor: Partial<TemporalObjectDescriptor>) {
        if (!this._temporalObject) {
            // Setting the time value to 0 while keeping the data of the original time.
            this._temporalObject = this.createNewTemporalObject(this._originalTemporalObject, 0, 0, this._minTimeInMinutes);
        } else {
            let days = this._temporalObjectAdapter.asDays(this._temporalObject);
            let hours = this._temporalObjectAdapter.getHours(this._temporalObject);
            let minutes = this._temporalObjectAdapter.getMinutes(this._temporalObject);
            // Defining the decrement step.
            if(actionDescriptor.minutes) {
                minutes -= 1;
            }
            if(actionDescriptor.minutesDecimal) {
                minutes -= 10;
            }
            if(actionDescriptor.hours) {
                hours -= 1;
            }
            if(actionDescriptor.hoursDecimal) {
                hours -= this.getHoursDecimalDecrementStep();
            }
            if(actionDescriptor.days) {
                days -= 1;
            }
            if(actionDescriptor.daysDecimal) {
                days -= 10;
            }

            days = this.handleDays ? days : 0;
            this.setTemporalValue(days, hours, minutes);
        }
    }

    /**
     * Checks if the current temporal object is a valid temporal object.
     * Null is considered a valid value.
     */
    isModelValid(): boolean {
        if(!this._temporalObjectAdapter) {
            return false;
        }

        return !this._temporalObject || this._temporalObjectAdapter.isValid(this._temporalObject);
    }

    get handleDays(): boolean {
        return this._handleDays;
    }

    set handleDays(value: boolean) {
        this._handleDays = value;
        this.updateMaxTime();
        this.updateMinTime();
    }

    get temporalObjectAdapter() {
        return this._temporalObjectAdapter;
    }

    /**
     * Determines which temporal object adapter is needed to handle the given object
     * and sets the proper apdater in the model.
     * @param object The temporal object used to determine which temporal object adapter is needed.
     */
    private inferAdapterFromTemporalObject(object: Duration | Moment | Date): void {
        if(isMoment(object)) {
            this._temporalObjectAdapter = new MomentTimeAdapter();
        }
        else if(isDuration(object)) {
            this._temporalObjectAdapter = new MomentDurationAdapter();
        }
        else if(object instanceof Date) {
            throw new Error("Native javascript dates are not supported yet.");
        }
        else if(!object) {
            throw new Error("An temporal object adapter must be specified if the object is null.");
        }
        else {
            throw new Error("Unsupported temporal object type in TimeInputModel. Only Moments, Moment.durations and Dates are allowed.");
        }
    }

    /**
     * This is a factory method to create a new temporal object from the given value.
     * If this value is falsy or invalid, it will create a new time from scratch.
     */
    private createNewTemporalObject(
        from: Duration | Moment | Date,
        days: number,
        hours: number,
        minutes: number
    ): Duration | Moment | Date {
        if (from && this._temporalObjectAdapter.isValid(from)) {
            return this._temporalObjectAdapter.createFrom(
                from,
                days,
                hours,
                minutes
            );
        } else {
            return this._temporalObjectAdapter.create(days, hours, minutes);
        }
    }

    private getHoursDecimalIncrementStep(): number {
        const currentNumberOfMinutesInTime =
            this._temporalObjectAdapter.getHours(this.getTemporalObject()) * 60 +
            this._temporalObjectAdapter.getMinutes(this.getTemporalObject());
        let incrementStep = 10;

        // The hours are on a base 24, which means that we have to adjust the increment step
        // so that the increment does not change the hours unit. (Ex: We increment the hours decimal of 0d 15:00,
        // we don't want it to display as 1d 01:00, but we want it as 1d 05:00).
        if (
            currentNumberOfMinutesInTime + this.NUMBER_OF_MINUTES_IN_TEN_HOURS >
            this.NUMBER_OF_MINUTES_IN_DAY
        ) {
            incrementStep =
                24 -
                this._temporalObjectAdapter.getHours(this.getTemporalObject()) +
                (this._temporalObjectAdapter.getHours(this.getTemporalObject()) % 10);
        }

        return incrementStep;
    }

    private getHoursDecimalDecrementStep(): number {
        const currentNumberOfMinutesInTime =
            this._temporalObjectAdapter.getHours(this.getTemporalObject()) * 60 +
            this._temporalObjectAdapter.getMinutes(this.getTemporalObject());
        let decrementStep = 10;

        // The hours are on a base 24, which means that we have to adjust the decrement step
        // so that the decrement does not change the hours unit. (Ex: We decrement the hours decimal of 1d 09:00,
        // we don't want it to display as 0d 23:00, but we want it as 0d 19:00).
        if (
            currentNumberOfMinutesInTime - this.NUMBER_OF_MINUTES_IN_TEN_HOURS <
            0
        ) {
            decrementStep =
                (this._temporalObjectAdapter.getHours(this.getTemporalObject()) +
                (14 - this._temporalObjectAdapter.getHours(this.getTemporalObject())) % 10);
        }

        return decrementStep;
    }

    private updateMaxTime(): void {
        this._maxTimeInMinutes = this._temporalObjectAdapter.getMaxTimeInMinutes(this._temporalObject, this._handleDays);
    }
    private updateMinTime(): void {
        this._minTimeInMinutes = this._temporalObjectAdapter.getMinTimeInMinutes(this._temporalObject, !this._handleDays);
    }
 }
