import { DebugElement } from '@angular/core';
import { async, ComponentFixture, TestBed, } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { NgMdTimeInputComponent } from './ng-md-time-input.component';
import { NgMdTimeInputModule } from './ng-md-time-input.module';
import { duration, Duration } from 'moment';

describe('NgMdTimeInputComponent', () => {
    const DAYS_DECIMAL_INPUT_NAME = "daysDecimal";
    const DAYS_UNIT_INPUT_NAME = "daysUnit";
    const HOURS_DECIMAL_INPUT_NAME = "hoursDecimal";
    const HOURS_UNIT_INPUT_NAME = "hoursUnit";
    const MINUTES_DECIMAL_INPUT_NAME = "minutesDecimal";
    const MINUTES_UNIT_INPUT_NAME = "minutesUnit";
    // The ids are the same but I created other variables for them in order to maintain the tests more easily.
    const DAYS_DECIMAL_INPUT_ID = "daysDecimal";
    const DAYS_UNIT_INPUT_ID = "daysUnit";
    const HOURS_DECIMAL_INPUT_ID = "hoursDecimal";
    const HOURS_UNIT_INPUT_ID = "hoursUnit";
    const MINUTES_DECIMAL_INPUT_ID = "minutesDecimal";
    const MINUTES_UNIT_INPUT_ID = "minutesUnit";

    const DISPLAYED_TIME_FORMAT = "HH:mm";

    let component: NgMdTimeInputComponent;
    let fixture: ComponentFixture<NgMdTimeInputComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [NgMdTimeInputModule]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(NgMdTimeInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display duration of 0 seconds when set to it via NgModel', () => {
        const currentTime = duration();
        const formattedCurrentTime = formatDuration(currentTime);
        // Setting up the time via the NgModel entry point in the component.
        component.writeValue(currentTime);
        fixture.detectChanges();
        const displayedTime = getDisplayedTime();
        expect(displayedTime).toEqual(formattedCurrentTime);
    });

    it('should display the given time when it is not the current time', () => {
        const currentTime = duration(24, "hours");
        const formattedCurrentTime = formatDuration(currentTime);
        // Setting up the time via the NgModel entry point in the component.
        component.writeValue(currentTime);
        fixture.detectChanges();
        const displayedTime = getDisplayedTime();
        expect(displayedTime).toEqual(formattedCurrentTime);
    });

    it('should contain the given time', () => {
        const currentTime = duration(24, "hours");
        // Setting up the time via the NgModel entry point in the component.
        component.writeValue(currentTime);
        fixture.detectChanges();
        const timeInComponent = component.value;
        expect(currentTime.asMinutes()).toEqual((<Duration>timeInComponent).asMinutes());
    });

    describe('Keyboard events', () => {
        it('should increment minutes unit by 1', () => {
            const currentTime = duration({ days: 0, hours: 23, minutes: 59 });
            const expectedTime = duration({ days: 1, hours: 0, minutes: 0 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Incrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowUp',
            });
            getInput(MINUTES_UNIT_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should decrement minutes unit by 1.', () => {
            const currentTime = duration({ days: 1, hours: 0, minutes: 0 });
            const expectedTime = duration({ days: 0, hours: 23, minutes: 59 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Decrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowDown',
            });
            getInput(MINUTES_UNIT_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should increment minutes decimal by 1.', () => {
            const currentTime = duration({ days: 0, hours: 23, minutes: 59 });
            const expectedTime = duration({ days: 1, hours: 0, minutes: 9 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Incrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowUp',
            });
            getInput(MINUTES_DECIMAL_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should decrement minutes decimal by 1', () => {
            const currentTime = duration({ days: 1, hours: 0, minutes: 0 });
            const expectedTime = duration({ days: 0, hours: 23, minutes: 50 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Decrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowDown',
            });
            getInput(MINUTES_DECIMAL_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should increment hours unit by 1', () => {
            const currentTime = duration({ days: 0, hours: 23, minutes: 59 });
            const expectedTime = duration({ days: 1, hours: 0, minutes: 59 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Incrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowUp',
            });
            getInput(HOURS_UNIT_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should decrement hours unit by 1', () => {
            const currentTime = duration({ days: 1, hours: 0, minutes: 0 });
            const expectedTime = duration({ days: 0, hours: 23, minutes: 0 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Decrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowDown',
            });
            getInput(HOURS_UNIT_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should increment the hours decimal field without impacting other fields', () => {
            const currentTime = duration({ days: 0, hours: 23, minutes: 59 });
            const expectedTime = duration({ days: 1, hours: 3, minutes: 59 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Incrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowUp',
            });
            getInput(HOURS_DECIMAL_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });

        it('should decrement the hours decimal field without impacting other fields', () => {
            const currentTime =  duration({ days: 1, hours: 0, minutes: 0 });
            const expectedTime =  duration({ days: 0, hours: 20, minutes: 0 });
            // Setting up the time via the NgModel entry point in the component.
            component.writeValue(currentTime);
            fixture.detectChanges();
            // Decrementing the value
            const event = new KeyboardEvent("keydown", {
                key: 'ArrowDown',
            });
            getInput(HOURS_DECIMAL_INPUT_ID).dispatchEvent(event);

            expect(expectedTime.asMinutes()).toEqual((<Duration>component.value).asMinutes());
        });
    });

    /*   describe("Focus and carret management", () => {
        it("should focus by default to the rightmost input when the user clicks on the field and label is not floating.", () => {
          const rightMostInput = getInput(MINUTES_UNIT_INPUT_ID);

          // After getting the rightmost input, we need to trigger a click on the component.
          fixture.nativeElement.click();
          fixture.detectChanges();
          const focusedElement = document.activeElement;

          expect(focusedElement).toBeTruthy();
          expect(focusedElement.id).toEqual(rightMostInput.id);
        });
      }); */

    describe("Control state management", () => {
        it("should be empty by default", () => {
            expect(component.value).toBeFalsy();
        });

        it("should be valid when empty and not required", () => {
            expect(component.errorState).toBeFalsy();
        });

        /* These tests are commented since I am not able to bind ngModel to test component.

        it("should be invalid when empty and required", () => {
            component.required = true;
            component.value = null;
            fixture.detectChanges();

            expect(component.ngControl.control.errors.required).toBeTruthy();
        });

        it("should be set to invalid when its content is invalid", () => {
            // After getting the rightmost input, we need to trigger a click on the component.
            component.parts.get(MINUTES_UNIT_INPUT_NAME).setErrors({ invalid: 'invalid' });
            component.propagateTouched();
            fixture.detectChanges();

            expect(component.ngControl.control.errors.invalid).toBeTruthy();
        }); */

        it("should be not be editable when it is disabled", () => {
            component.disabled = true;
            fixture.detectChanges();

            const childInputs = fixture.debugElement.queryAll(By.css("input"));

            for(const child of childInputs) {
                expect(child.nativeElement.disabled).toBeTruthy(child.attributes['formControlName'] + " is not disabled");
            }
        });
    });

    /**
     * @returns the displayed time, in the HH:mm format.
     */
    function getDisplayedTime(): string {
        const daysDecimal = component.parts.get(DAYS_DECIMAL_INPUT_NAME).value;
        const daysUnit = component.parts.get(DAYS_UNIT_INPUT_NAME).value;
        const hoursDecimal = component.parts.get(HOURS_DECIMAL_INPUT_NAME).value;
        const hoursUnit = component.parts.get(HOURS_UNIT_INPUT_NAME).value;
        const minutesDecimal = component.parts.get(MINUTES_DECIMAL_INPUT_NAME).value;
        const minutesUnit = component.parts.get(MINUTES_UNIT_INPUT_NAME).value;

        return `${daysDecimal}${daysUnit}d${hoursDecimal}${hoursUnit}:${minutesDecimal}${minutesUnit}`;
    }

    function formatDuration(duration: Duration) {
        let days = Math.floor(duration.asDays()).toString();
        let hours = duration.hours().toString();
        let minutes = duration.minutes().toString();
        // Adding up the 00:00 padding in order to have the same format as the displayed time.
        if (days.length < 2) {
            days = "0" + days;
        }
        if (hours.length < 2) {
            hours = "0" + hours;
        }
        if (minutes.length < 2) {
            minutes = "0" + minutes;
        }

        return days + "d" + hours + ":" + minutes;
    }

    function getInput(inputId: string): HTMLElement {
        return fixture.debugElement.query(By.css(`#${inputId}`)).nativeElement;
    }
});
