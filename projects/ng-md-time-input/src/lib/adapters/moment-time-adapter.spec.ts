import { DebugElement } from '@angular/core';
import { async, ComponentFixture, TestBed, } from '@angular/core/testing';

import { MomentTimeAdapter } from './moment-time-adapter';
import { utc, Moment } from 'moment';

describe('MomentTimeAdapter', () => {

    const adapter = new MomentTimeAdapter();

    it('should create', () => {
        expect(adapter).toBeTruthy();
    });

    it('should create a new duration with proper time when time is all zeros', () => {
        const correctTime = utc({date: 1, hours: 0, minutes: 0, seconds: 0, millisecond: 0});
        const timeToTest = adapter.create(1,0,0);

        expect(timeToTest.format("L HH:mm")).toEqual(correctTime.format("L HH:mm"));
    });

    it('should create a new duration with proper time', () => {
        const correctTime = utc({date: 1, hours: 23, minutes: 59, seconds: 0, millisecond: 0});
        const timeToTest = adapter.create(1,23,59);

        expect(timeToTest.format("L HH:mm")).toEqual(correctTime.format("L HH:mm"));
    });

    it('should create a new duration with proper time when using the createFrom function', () => {
        const correctTime = utc({year: 1992, months: 10, date: 1, hours: 23, minutes: 59});
        const timeToTest = adapter.createFrom(correctTime, 1, 23, 59);

        expect(timeToTest.format("L HH:mm")).toEqual(correctTime.format("L HH:mm"));
    });

    it('should create a new duration with proper time when using the createFrom function and the max number of days in a month', () => {
        const correctTime = utc({year: 1992, months: 10, date: 30, hours: 23, minutes: 59});
        const timeToTest = adapter.createFrom(correctTime, 30, 23, 59);

        expect(timeToTest.format("L HH:mm")).toEqual(correctTime.format("L HH:mm"));
    });

    it('should create a new duration when using the createFrom function without changing its month or year', () => {
        const correctTime = utc({year: 2018, months: 6, date: 1, hours: 23, minutes: 59});
        const timeToTest = adapter.createFrom(correctTime, correctTime.daysInMonth() + 1, 23, 59);

        expect(timeToTest.format("L HH:mm")).toEqual(correctTime.format("L HH:mm"));
    });

    it('should properly clone the duration object', () => {
        const correctTime = utc({date: 1, hours: 23, minutes: 59});
        const timeToTest = adapter.clone(correctTime);

        expect(timeToTest.format("L HH:mm")).toEqual(correctTime.format("L HH:mm"));
    });

    it('should create a new object when cloning the duration object', () => {
        const correctTime = utc({date: 1, hours: 23, minutes: 59});
        const timeToTest = adapter.clone(correctTime);

        correctTime.subtract(1, 'minutes');

        expect(timeToTest.minutes()).toBeGreaterThan(correctTime.minutes());
    });

    it('should get the proper number of days when using the asDays function', () => {
        const correctTime = utc({date: 1, hours: 23, minutes: 59});
        const days = adapter.asDays(correctTime);

        expect(days).toEqual(1);
    });

    it('should get the proper hour when using the getHours function', () => {
        const correctTime = utc({date: 1, hours: 23, minutes: 59});
        const hours = adapter.getHours(correctTime);

        expect(hours).toEqual(23);
    });

    it('should get the proper minutes when using the getMinutes function', () => {
        const correctTime = utc({date: 1, hours: 23, minutes: 59});
        const minutes = adapter.getMinutes(correctTime);

        expect(minutes).toEqual(59);
    });

    it('should mark the duration as invalid when it is null', () => {
        const testDuration = null;
        const isValid = adapter.isValid(testDuration);

        expect(isValid).toBeFalsy();
    });
});
