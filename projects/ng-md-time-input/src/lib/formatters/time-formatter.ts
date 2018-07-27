import { Injectable } from "@angular/core";
import { TimeInputAdapter } from "../adapters";
import { Duration, Moment } from "moment";

export interface FormattedTime {
    fullString: string;
    days?: string;
    hours: string;
    minutes: string;
}
/**
 * The purpose of this class is to get a string representation of
 * a temporal object.
 */
@Injectable()
export class TimeFormatter {

    constructor() {}

    /**
     * This function takes the temporal object and formats it to a padded format.
     * If the temporal object is not a valid, it will set it to an empty string.
     */
    formatDislayedTime(
        temporalObject: any,
        timeAdapter: TimeInputAdapter<Duration | Moment | Date>,
        showDays: boolean
    ): FormattedTime {
        if (!temporalObject || !timeAdapter.isValid(temporalObject)) {
            return {
                fullString: "",
                days: "",
                hours: "",
                minutes: ""
            };
        }
        // Else, update the model with the written time.
        else if (showDays) {
            return this.formatWithDays(temporalObject, timeAdapter);
        }
        else {
            return this.formatWithoutDays(temporalObject, timeAdapter);
        }
    }

    private formatWithDays(
        temporalObject: any,
        timeAdapter: TimeInputAdapter<Duration | Moment | Date>
    ): FormattedTime {
        const formattedTime = this.formatWithoutDays(temporalObject, timeAdapter);

        formattedTime.days = this.padWithChar(
            "0",
            timeAdapter.asDays(temporalObject).toString(),
            2
        );

        formattedTime.fullString = formattedTime.days + formattedTime.hours + formattedTime.minutes;

        return formattedTime;
    }

    private formatWithoutDays(
        temporalObject: any,
        timeAdapter: TimeInputAdapter<Duration | Moment | Date>
    ): FormattedTime {
        const hours = this.padWithChar(
            "0",
            timeAdapter.getHours(temporalObject).toString(),
            2
        );

        const minutes = this.padWithChar(
            "0",
            timeAdapter.getMinutes(temporalObject).toString(),
            2
        );

        return {
            fullString: hours + minutes,
            hours,
            minutes
        };
    }

    /**
     * Pads the given value with the given char. The padding is added at the beginning of the value.
     * @param paddingChar The char to use as padding. Its length must be of 1.
     * @param valueToPad The string value you want to pad.
     * @param desiredFinalLength The final desired length of the string.
     * @returns The padded representation of the given value.
     */
    private padWithChar(
        paddingChar: string,
        valueToPad: string,
        desiredFinalLength: number
    ): string {
        if (!paddingChar || paddingChar.length !== 1) {
            throw new Error(
                "[padWithChar] Cannot have multiple characters as padding. Only one is allowed."
            );
        }

        const paddedString =
            paddingChar.repeat(desiredFinalLength) + valueToPad;
        return paddedString.slice(desiredFinalLength * -1);
    }
}
