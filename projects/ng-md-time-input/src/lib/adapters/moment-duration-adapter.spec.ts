import { DebugElement } from '@angular/core';
import { async, ComponentFixture, TestBed, } from '@angular/core/testing';

import { MomentDurationAdapter } from './moment-duration-adapter';
import { duration, Duration } from 'moment';

describe('MomentDurationAdapter', () => {

    const adapter = new MomentDurationAdapter();

    it('should create', () => {
        expect(adapter).toBeTruthy();
    });

    it('should create a new duration with proper time when time is all zeros', () => {
        const correctDuration = duration({days: 0, hours: 0, minutes: 0});
        const durationToTest = adapter.create(0,0,0);

        expect(durationToTest.asMinutes()).toEqual(correctDuration.asMinutes());
    });

    it('should create a new duration with proper time', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const durationToTest = adapter.create(1,23,59);

        expect(durationToTest.asMinutes()).toEqual(correctDuration.asMinutes());
    });

    it('should create a new duration with proper time when using the createFrom function', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const durationToTest = adapter.createFrom(correctDuration, 1, 23, 59);

        expect(durationToTest.asMinutes()).toEqual(correctDuration.asMinutes());
    });

    it('should properly clone the duration object', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const durationToTest = adapter.clone(correctDuration);

        expect(durationToTest.asMinutes()).toEqual(correctDuration.asMinutes());
    });

    it('should create a new object when cloning the duration object', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const durationToTest = adapter.clone(correctDuration);

        correctDuration.subtract(1, 'minutes');

        expect(durationToTest.asMinutes()).toBeGreaterThan(correctDuration.asMinutes());
    });

    it('should get the proper number of days when using the asDays function', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const days = adapter.asDays(correctDuration);

        expect(days).toEqual(1);
    });

    it('should get the proper hour when using the getHours function', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const hours = adapter.getHours(correctDuration);

        expect(hours).toEqual(23);
    });

    it('should get the proper minutes when using the getMinutes function', () => {
        const correctDuration = duration({days: 1, hours: 23, minutes: 59});
        const minutes = adapter.getMinutes(correctDuration);

        expect(minutes).toEqual(59);
    });

    it('should mark the duration as invalid when it is null', () => {
        const testDuration = null;
        const isValid = adapter.isValid(testDuration);

        expect(isValid).toBeFalsy();
    });
});
