import { TestBed, inject } from "@angular/core/testing";
import { TimeInputModel } from "./time-input.model";
// Moment
import { utc, invalid, duration, Duration, isDuration, isMoment } from "moment";
import { MomentDurationAdapter, MomentTimeAdapter } from "../adapters";


describe("TimeInputModel", () => {
    let model: TimeInputModel;

    beforeEach(() => {
        model = new TimeInputModel();
    });

    it("should be created", () => {
        expect(model).toBeTruthy();
    });

    it('should return the given moment time object if no changes were made', () => {
        const timeObject = utc().set({
            year: 1999,
            month: 10,
            day: 6,
            hours: 23,
            minutes: 59,
            second: 59,
            millisecond: 10
        });

        const adapter = new MomentTimeAdapter();
        model.setTemporalObject(timeObject, adapter);

        expect(model.getTemporalObject().valueOf()).toEqual(timeObject.valueOf());
    });

    it('should return the given moment duration object if no changes were made', () => {
        const durationObject = duration({
            year: 1999,
            month: 10,
            day: 6,
            hours: 23,
            minutes: 59,
            second: 59,
            millisecond: 10
        });

        const adapter = new MomentDurationAdapter();
        model.setTemporalObject(durationObject, adapter);

        const durationInModel = (model.getTemporalObject() as Duration).asMinutes();

        expect(durationInModel).toEqual(durationObject.asMinutes());
    });

    it('should set adapter to MomentDurationAdapter if the adapter is not specified and the temporal object is null', () => {
        const temporalObject = null;
        model.setTemporalObject(temporalObject)
        expect(model.temporalObjectAdapter instanceof MomentDurationAdapter).toBeTruthy();
    });

    it(`should be null when duration updated with empty strings`, () => {
        const durationObject = duration();

        model.setTemporalObject(durationObject);
        model.updateTime("","","");

        expect(model.getTemporalObject()).toBeNull();
    });

    it(`should be null when time updated with empty strings`, () => {
        const timeObject = utc();

        model.setTemporalObject(timeObject);
        model.updateTime("","","");

        expect(model.getTemporalObject()).toBeNull();
    });

    it(`should create a duration object when initially set to a duration object without a specified adapter,
        then set to null and then set to a given string value`, () => {
        const durationObject = duration();

        model.setTemporalObject(durationObject);
        model.updateTime("","","");
        model.updateTime("","","1");
        // Test if a duration object has been created
        expect(isDuration(model.getTemporalObject())).toBeTruthy();
    });

    it(`should create a moment time object when initially set to a moment time object without a specified adapter,
        then set to null and then set to a given string value`, () => {
        const timeObject = utc();

        model.setTemporalObject(timeObject);
        model.updateTime("","","");
        model.updateTime("","","1");
        // Test if a moment object has been created
        expect(isMoment(model.getTemporalObject())).toBeTruthy();
    });

    it(`should create a date with the same date value when `, () => {
        const durationObject = duration();

        model.setTemporalObject(durationObject);
        model.updateTime("","","");
        model.updateTime("","","1");
        // Test if a duration object has been created
        expect(isDuration(model.getTemporalObject())).toBeTruthy();
    });
});
