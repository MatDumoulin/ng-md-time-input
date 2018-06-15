import {
    Component,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ElementRef,
    forwardRef,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Renderer2,
    Self,
    ViewChild,
    ViewChildren,
    QueryList
} from "@angular/core";
import {
    ControlValueAccessor,
    FormBuilder,
    FormGroup,
    NG_VALUE_ACCESSOR,
    NgControl,
    Validators,
    AbstractControl,
    Validator,
    ValidatorFn,
    FormArray,
    FormControl
} from "@angular/forms";
import { MatFormFieldControl } from "@angular/material";
import { FocusMonitor, FocusOrigin } from "@angular/cdk/a11y";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { Subject, Subscription } from "rxjs";
// Moment
import { Duration, duration, isDuration, Moment } from "moment";
// Others
import { TimeFactoryService } from "./time-factory.service";
// Time Adapters
import { MomentDurationAdapter, TimeInputAdapter } from "./adapters";
import { TimeFormatter } from "./formatters";

const MINUTES_UNIT_INCREMENT_STEP = 1;
const NUMBER_OF_MINUTES_IN_TEN_MINUTES = 10;
const NUMBER_OF_MINUTES_IN_HOUR = 60;
const NUMBER_OF_MINUTES_IN_TEN_HOURS = 600;
const NUMBER_OF_MINUTES_IN_DAY = 1440;
const NUMBER_OF_MINUTES_IN_TEN_DAYS = 14400;
const MAX_TIME_WITH_DAYS = 143999; // 99d 23:59
const MAX_TIME_WITHOUT_DAYS = 1439; // 23:59

@Component({
    selector: "ng-md-time-input",
    templateUrl: "./ng-md-time-input.component.html",
    styleUrls: ["./ng-md-time-input.component.css"],
    providers: [
        { provide: MatFormFieldControl, useExisting: NgMdTimeInputComponent }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    inputs: [
        "daysSeparator",
        "hoursSeparator",
        "minutesSeparator",
        "showDays",
        "timeAdapter",
        "value",
        "placeholder",
        "disabled",
        "required"
    ]
})
export class NgMdTimeInputComponent
    implements
        OnInit,
        OnDestroy,
        MatFormFieldControl<Duration | Moment | Date>,
        ControlValueAccessor {
    static nextId = 0;
    // UI
    daysSeparator = "d";
    hoursSeparator = ":";
    minutesSeparator = "";
    separators = ["d", ":", ""];
    private _showDays = true;
    // Time management
    time: Duration | Moment | Date;
    private _timeAdapter: TimeInputAdapter<
        Duration | Moment | Date
    > = new MomentDurationAdapter();
    private _maxTimeInMinutes = MAX_TIME_WITH_DAYS; // 99d 23:59
    // Form element management
    private _preventFocusLoss = false;
    private subscriptions: Subscription[] = [];
    stateChanges = new Subject<void>();
    @ViewChildren("input") inputs: QueryList<ElementRef>;

    // For the change event
    private previousTime: Duration | Moment | Date = null;
    private shouldManuallyTriggerChangeEvent: boolean;
    //////////////////////////////////////////////////////////////////
    // For Mat Form Field
    // Used by Angular Material to map hints and errors to the control.
    @HostBinding() id = `time-input-${NgMdTimeInputComponent.nextId++}`;
    // Used by Angular Material to bind Aria ids to our control
    @HostBinding("attr.aria-describedby") describedBy = "";

    partsGroup: FormGroup;
    parts: FormArray;
    private _placeholder: string;
    focused = false;
    private _required = false;
    private _disabled = false;
    errorState = false; // By default the input is valid.
    controlType = "time-input"; // Class identifier for this control will be mat-form-field-time-input.

    // NgModel
    propagateChange = (_: any) => {};
    propagateTouched = () => {};

    constructor(
        private changeDetectorRef: ChangeDetectorRef,
        private elRef: ElementRef,
        fb: FormBuilder,
        private fm: FocusMonitor,
        private formatter: TimeFormatter,
        @Optional()
        @Self()
        public ngControl: NgControl,
        private _renderer: Renderer2,
        private timeFactoryService: TimeFactoryService
    ) {
        // Form initialization. On top of a directive that prevents the input of non
        // numerical char, we add a pattern to assure that only numbers are allowed.
        this.parts = fb.array(
            ["", "", "", "", "", ""],
            Validators.pattern(/[0-9]/)
        );
        // The form array must be in a FormGroup in order to use it in the HTML.
        this.partsGroup = fb.group({
            inputs: this.parts
        });
        /* {
            daysDecimal: ["", Validators.pattern(/[0-9]/)],
            daysUnit: ["", Validators.pattern(/[0-9]/)],
            hoursDecimal: ["", Validators.pattern(/[0-9]/)],
            hoursUnit: ["", Validators.pattern(/[0-9]/)],
            minutesDecimal: ["", Validators.pattern(/[0-9]/)],
            minutesUnit: ["", this.getMinutesUnitValidator()]
        }); */

        // Subscribing to the form's status change in order to sync up the state of the NgControl with
        // the one of the form.
        this.subscriptions.push(
            this.parts.statusChanges.subscribe(() =>
                this.handleFormStatusChange()
            )
        );

        // Monitoring the focus in the time input.
        fm.monitor(elRef.nativeElement, true).subscribe(origin =>
            this.handleFocusChange(origin)
        );

        if (this.ngControl != null) {
            this.ngControl.valueAccessor = this;
        }
    }

    ngOnInit() {
        this.elRef.nativeElement.addEventListener("change", () => {
            this.shouldManuallyTriggerChangeEvent = false;
        });
    }

    ngOnDestroy() {
        // Cleaning up resources.
        this.stateChanges.complete();
        this.fm.stopMonitoring(this.elRef.nativeElement);
        for (const sub of this.subscriptions) {
            sub.unsubscribe();
        }
    }

    /////////////////////////////////////////////////////////////////////
    // Getters and setters

    // This is where the NgModel with update our time.
    get value(): Duration | Moment | Date | null {
        return this.time;
    }
    set value(time: Duration | Moment | Date | null) {
        if (time && isDuration(time)) {
            this.time = time.clone();
        } else {
            this.time = null;
        }
        // Sets the time to display in the proper format.
        this.formatDislayedTime();

        this.emitChanges();
        this.shouldManuallyTriggerChangeEvent = false;
    }

    set showDays(showDays: boolean) {
        // Add two inputs to handle the days.
        if (!this._showDays && showDays) {
            this.parts.insert(0, new FormControl(""));
            this.parts.insert(0, new FormControl(""));
        }
        // Remove the days input.
        else if (this._showDays && !showDays) {
            this.parts.removeAt(0);
            this.parts.removeAt(0);
        }

        this._showDays = showDays;
        this._maxTimeInMinutes = showDays
            ? MAX_TIME_WITH_DAYS
            : MAX_TIME_WITHOUT_DAYS;
        this.formatDislayedTime();
    }
    get showDays(): boolean {
        return this._showDays;
    }

    set timeAdapter(adapter: TimeInputAdapter<Duration | Moment | Date>) {
        // Check if the current time object matches the new adapter.
        if (this.time && !adapter.isValid(this.time)) {
            // If it is not the case, log an error
            throw new Error(
                "The given TimeInputAdapter does not match the current NgModel value type."
            );
        } else {
            this._timeAdapter = adapter;
        }
    }

    get timeAdapter(): TimeInputAdapter<Duration | Moment | Date> {
        return this._timeAdapter;
    }
    ////////////////////////////////////////////////////////////////////

    /**
     * Gets the string representation of the displayed time.
     */
    private getDisplayedTime(): string {
        return this.displayedDays + this.displayedHours + this.displayedMinutes;
    }

    /**
     * Sets the displayed days to the given value.
     * Note: This affectation will not change the ngModel value.
     */
    set displayedDays(days: string | null) {
        if (days) {
            const daysDecimal = this.getControlAt(0);
            const daysUnit = this.getControlAt(1);
            daysDecimal.setValue(days.charAt(days.length - 2));
            daysUnit.setValue(days.charAt(days.length - 1));
        }
    }
    get displayedDays(): string {
        const daysDecimal = this.getControlAt(0);
        const daysUnit = this.getControlAt(1);

        return daysDecimal.value + daysUnit.value;
    }

    /**
     * Sets the displayed hours to the given value.
     * Note: This affectation will not change the ngModel value.
     */
    set displayedHours(hours: string) {
        const hoursDecimal = this.getControlAt(-4);
        const hoursUnit = this.getControlAt(-3);
        hoursDecimal.setValue(hours.charAt(hours.length - 2));
        hoursUnit.setValue(hours.charAt(hours.length - 1));
    }
    get displayedHours(): string {
        const hoursDecimal = this.getControlAt(-4);
        const hoursUnit = this.getControlAt(-3);

        return hoursDecimal.value + hoursUnit.value;
    }

    /**
     * Sets the displayed minutes to the given value.
     * Note: This affectation will not change the ngModel value.
     */
    set displayedMinutes(minutes: string) {
        const minutesDecimal = this.getControlAt(-2);
        const minutesUnit = this.getControlAt(-1);
        minutesDecimal.setValue(minutes.charAt(minutes.length - 2));
        minutesUnit.setValue(minutes.charAt(minutes.length - 1));
    }
    get displayedMinutes(): string {
        const minutesDecimal = this.getControlAt(-2);
        const minutesUnit = this.getControlAt(-1);

        return minutesDecimal.value + minutesUnit.value;
    }

    private getControlAt(index: number): AbstractControl {
        // If the index is negative and its absolute value is bigger than
        // the number of controls, prevent it from accessing the negative index.
        if (index + this.parts.controls.length < 0) {
            index = 0;
        }
        // If the index is negative but its absolute value is still in the
        // range of the controls, access the controls from the end.
        else if (index < 0) {
            index = this.parts.controls.length + index;
        }

        return this.parts.controls[index];
    }

    ////////////////////////////////////////////////////////////////////////////
    // Time management
    /**
     * Updates both the ngModel time and the displayed time of the control with the values
     * currently displayed in the time input.
     */
    updateTime(): void {
        this.updateDisplayedTime();
        this.setTimeFromString(
            this.displayedDays,
            this.displayedHours,
            this.displayedMinutes
        );
    }

    /**
     * Updates the time displayed in the time input. This function does not change the NgModel.
     */
    updateDisplayedTime(): void {
        let displayedTime = this.getDisplayedTime();
        displayedTime = displayedTime.slice(-6); // Take only the last 6 characters for our time. (The max is 6 digits)

        this.displayedMinutes = displayedTime.slice(-2); // Take only the last two characters.
        this.displayedHours = displayedTime.slice(-4, -2); // Takes from the fourth character starting from the end to the second.
        if (this.showDays) {
            this.displayedDays = displayedTime.slice(0, -4); // Take all characters but the last four.
        }
    }

    /**
     * Converts a time string into a proper time format. It also set the ngModel time to the converted value.
     * @param daysString The days to set. The maximum day allowed is 99.
     * @param hoursString The hours to set. The hours will be converted to a 24 hours format. This means that
     *                    if the given hour is 25, the displayed hours will be 1.
     * @param minutesString The minutes to set. The minutes will be onverted to a 60 minutes format. This means
     *                      if the given minute 61, it will add an hour and set the minutes to 01.
     */
    setTimeFromString(
        daysString: string,
        hoursString: string,
        minutesString: string
    ): void {
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
            this.time = null;
        } else {
            days = Number.isNaN(days) ? 0 : days;
            hours = Number.isNaN(hours) ? 0 : hours;
            minutes = Number.isNaN(minutes) ? 0 : minutes;

            this.setTime(days, hours, minutes);
        }

        this.emitChanges();
    }

    private setTime(days: number, hours: number, minutes: number) {
        const timeInMinutes =
            days * NUMBER_OF_MINUTES_IN_DAY +
            hours * NUMBER_OF_MINUTES_IN_HOUR +
            minutes;
        // If the time is greater than the max time, set it to the max time.
        if (timeInMinutes > this._maxTimeInMinutes) {
            this.time = this.timeAdapter.create(0, 0, this._maxTimeInMinutes);
        }
        // Else, if the time is negative, set it to 0.
        else if (timeInMinutes < 0) {
            this.time = this.timeAdapter.create(0, 0, 0);
        } else {
            this.time = this.timeAdapter.create(0, 0, timeInMinutes);
        }
    }

    /**
     * This function takes the time and formats it to a padded format.
     * If the time is not a duration, it will set it to an empty string.
     */
    private formatDislayedTime() {
        const formattedTime = this.formatter.formatDislayedTime(
            this.time,
            this.timeAdapter,
            this.showDays
        );

        this.displayedDays = formattedTime.days;
        this.displayedHours = formattedTime.hours;
        this.displayedMinutes = formattedTime.minutes;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Event handling
    private handleFocusChange(origin: FocusOrigin): void {
        const elementIsFocused = !!origin;
        // If the component just gain the focus, automatically focus the rightmost input.
        if (!this.focused && elementIsFocused) {
            this.focusLastInput(origin);
        }

        // Setting up the focused state. The element is focused when we prevent the focus loss
        // or when it is really focused.
        this.focused = this._preventFocusLoss || elementIsFocused;

        // If the component has been focused out, format the displayed time.
        if (!this.focused) {
            this.formatDislayedTime();
            if (this.ngControl) {
                this.ngControl.control.markAsTouched();
            }
            // By default, the change event is only triggered when the user types in a new value.
            // In our case, we want to trigger it when the user increments/decrements the value too.
            if (this.shouldManuallyTriggerChangeEvent) {
                const changeEvent = this.newEvent("change");
                this.elRef.nativeElement.dispatchEvent(changeEvent);
            }
        }
        // The focus loss prevention is only applied once. After that, return to normal focus management.
        this._preventFocusLoss = false;

        this.stateChanges.next();
    }

    private handleFormStatusChange() {
        if (!this.parts.invalid && this.errorState) {
            this.errorState = false;
        } else if (this.parts.invalid && !this.errorState) {
            this.errorState = true;
        }
    }

    /**
     * Handles the keydown event on the time input.
     * @param event The keyboard event related to the key down.
     * @param targettedInputName The form control that had the focus while the key was pressed.
     */
    handleKeydown(event: KeyboardEvent, targettedInputIndex: number): void {
        // On up arrow, we want to increment the targetted input
        if (event.key === "ArrowUp" || event.key === "Up") {
            const incrementStep = this.getIncrementStep(targettedInputIndex);
            this.incrementTime(incrementStep);
            event.preventDefault(); // Prevents the carret from moving to the lefthand of the input
            // event.stopPropagation(); // prevents the carret from moving
            return;
        }
        // On down arrow, we want to decrement the targetted input
        else if (event.key === "ArrowDown" || event.key === "Down") {
            const decrementStep = this.getDecrementStep(targettedInputIndex);
            this.incrementTime(decrementStep);
            event.preventDefault(); // Prevents the carret from moving to the righthand of the input
            // event.stopPropagation(); // prevents the carret from moving
            return;
        }
        // On left arrow, we want to move the carret to the left sibling of the targetted input
        else if (event.key === "ArrowLeft" || event.key === "Left") {
            const leftSibling = this.getLeftSiblingOfInput(targettedInputIndex);
            // The sibling can be null if the carret cannot go further to the left or
            // can be undefined if the ViewChild was not properly initialized.
            if (leftSibling && leftSibling.nativeElement.value) {
                this.keepFocus(); // Otherwise, the focus is lost momentarly
                this.focusInput(leftSibling.nativeElement, "keyboard");
            }
            event.preventDefault(); // Prevents the carret from moving to the lefthand of the input
            event.stopPropagation(); // prevents the carret from cancelling the new focus

            return;
        }
        // On right arrow, we want to move the carret to the right sibling of the targetted input
        else if (event.key === "ArrowRight" || event.key === "Right") {
            const rightSibling = this.getRightSiblingOfInput(
                targettedInputIndex
            );
            // The sibling can be null if the carret cannot go further to the right or
            // can be undefined if the ViewChild was not properly initialized.
            if (rightSibling && rightSibling.nativeElement.value) {
                this.keepFocus(); // Otherwise, the focus is lost momentarly
                this.focusInput(rightSibling.nativeElement, "keyboard");
            }

            event.preventDefault(); // Prevents the carret from moving to the righthand of the input
            event.stopPropagation(); // prevents the carret from cancelling the new focus
            return;
        }
    }

    /**
     * Increments the current time by the given amount of minutes.
     * @param incrementStep The increment step, in minutes.
     */
    incrementTime(incrementStep: number) {
        if (!this.time) {
            this.time = duration();
        }

        this.setTime(
            this.timeAdapter.asDays(this.time),
            this.timeAdapter.getHours(this.time),
            this.timeAdapter.getMinutes(this.time) + incrementStep
        );

        // Once the ngModel is updated, update the displayed time.
        this.formatDislayedTime();
        this.emitChanges();
        // Since the inputs are not recognizing the increment as an input event, we got to manually trigger one.
        const inputEvent = this.newEvent("input");
        this.elRef.nativeElement.dispatchEvent(inputEvent);
    }

    /**
     * @returns The proper increment step, based on the given input name.
     */
    private getIncrementStep(inputIndex: number): number {
        if (!this.showDays) {
            inputIndex = +2;
        }
        // Even though it is not the most elegant way of getting the increment step,
        // it is done that way because of the hours decimal being base 24. The step
        // is not constant and it changes depending on the current value of the hours.
        switch (inputIndex) {
            case 0: // daysDecimal
                return NUMBER_OF_MINUTES_IN_TEN_DAYS;
            case 1: // daysUnit
                return NUMBER_OF_MINUTES_IN_DAY;
            case 2: // hoursDecimal
                return this.getHoursDecimalIncrementStep();
            case 3: // hoursUnit
                return NUMBER_OF_MINUTES_IN_HOUR;
            case 4: // minutesDecimal
                return NUMBER_OF_MINUTES_IN_TEN_MINUTES;
            case 5: // minutesUnit
                return MINUTES_UNIT_INCREMENT_STEP;
        }
    }
    /**
     * @returns The proper decrement step, based on the given input name.
     */
    private getDecrementStep(inputIndex: number): number {
        if (!this.showDays) {
            inputIndex = +2;
        }
        // Even though it is not the most elegant way of getting the decrement step,
        // it is done that way because of the hours decimal being base 24. The step
        // is not constant and it changes depending on the current value of the hours.
        switch (inputIndex) {
            case 0: // daysDecimal
                return -1 * NUMBER_OF_MINUTES_IN_TEN_DAYS;
            case 1: // daysUnit
                return -1 * NUMBER_OF_MINUTES_IN_DAY;
            case 2: // hoursDecimal
                return this.getHoursDecimalDecrementStep();
            case 3: // hoursUnit
                return -1 * NUMBER_OF_MINUTES_IN_HOUR;
            case 4: // minutesDecimal
                return -1 * NUMBER_OF_MINUTES_IN_TEN_MINUTES;
            case 5: // minutesUnit
                return -1 * MINUTES_UNIT_INCREMENT_STEP;
        }
    }

    private getHoursDecimalIncrementStep(): number {
        const currentNumberOfMinutesInTime =
            this.timeAdapter.getHours(this.time) * 60 +
            this.timeAdapter.getMinutes(this.time);
        let incrementStep = NUMBER_OF_MINUTES_IN_TEN_HOURS;

        // The hours are on a base 24, which means that we have to adjust the increment step
        // so that the increment does not change the hours unit. (Ex: We increment the hours decimal of 0d 15:00,
        // we don't want it to display as 1d 01:00, but we want it as 1d 05:00).
        if (
            currentNumberOfMinutesInTime + NUMBER_OF_MINUTES_IN_TEN_HOURS >
            NUMBER_OF_MINUTES_IN_DAY
        ) {
            incrementStep =
                (24 -
                    this.timeAdapter.getHours(this.time) +
                    (this.timeAdapter.getHours(this.time) % 10)) *
                NUMBER_OF_MINUTES_IN_HOUR;
        }

        return incrementStep;
    }

    private getHoursDecimalDecrementStep(): number {
        const currentNumberOfMinutesInTime =
            this.timeAdapter.getHours(this.time) * 60 +
            this.timeAdapter.getMinutes(this.time);
        let decrementStep = NUMBER_OF_MINUTES_IN_TEN_HOURS * -1;

        // The hours are on a base 24, which means that we have to adjust the decrement step
        // so that the decrement does not change the hours unit. (Ex: We decrement the hours decimal of 1d 09:00,
        // we don't want it to display as 0d 23:00, but we want it as 0d 19:00).
        if (currentNumberOfMinutesInTime - NUMBER_OF_MINUTES_IN_TEN_HOURS < 0) {
            decrementStep =
                (this.timeAdapter.getHours(this.time) +
                    ((14 - this.timeAdapter.getHours(this.time)) % 10)) *
                NUMBER_OF_MINUTES_IN_HOUR *
                -1;
        }

        return decrementStep;
    }

    private getLeftSiblingOfInput(inputIndex: number): ElementRef | null {
        inputIndex -= 1;
        if (inputIndex <= 0) {
            return null;
        }

        return this.inputs.toArray()[inputIndex];
    }
    private getRightSiblingOfInput(inputIndex: number): ElementRef | null {
        inputIndex += 1;
        if (inputIndex >= this.inputs.length) {
            return null;
        }

        return this.inputs.toArray()[inputIndex];
    }

    /**
     * Focuses the last input in the control.
     */
    focusLastInput(origin: FocusOrigin): void {
        this.focusInput(
            this.inputs.toArray()[this.inputs.length - 1].nativeElement,
            origin
        );
    }

    private focusInput(input: HTMLElement, origin: FocusOrigin): void {
        if (input && origin) {
            this.fm.focusVia(input, origin);
        }
    }

    /**
     * This function is to fix an undesired interaction that caused the component to loose focus when the used clicks on a separator.
     */
    keepFocus() {
        this._preventFocusLoss = true;
    }

    /**
     * This function is to create an event with modern browser or old browser
     * @param type Type of event to create
     */
    private newEvent(type: string): Event {
        let changeEvent: Event;
        // Try creating a new event that is compatible with modern browsers
        try {
            changeEvent = new Event(type);
        } catch (err) {
            // If the browser does not support this way of creating an event (eg. IE11), do it the old way.
            changeEvent = document.createEvent("HTMLEvents");
            changeEvent.initEvent(type, true, false);
        }

        return changeEvent;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Validators
    private getMinutesUnitValidator(): ValidatorFn {
        const validators: ValidatorFn[] = [Validators.pattern(/[0-9]/)];

        if (this.required) {
            validators.push(Validators.required);
        }

        return Validators.compose(validators);
    }
    ////////////////////////////////////////////////////////////////////////////
    // Mat Form Field support
    @Input()
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(plh) {
        this._placeholder = plh;
        this.stateChanges.next();
    }

    // This functions tells the mat-form-field wheter it is empty or not.
    get empty() {
        return !this.time || !isDuration(this.time);
    }

    // Used by Angular Material to display the label properly
    @HostBinding("class.floating")
    get shouldLabelFloat() {
        return this.focused || !this.empty;
    }

    // To handle required property on form field
    @Input()
    get required() {
        return this._required;
    }
    set required(req) {
        this._required = coerceBooleanProperty(req);
        // Updating the required status of the inputs.
        const minutesUnit = this.getControlAt(-1);
        minutesUnit.setValidators(this.getMinutesUnitValidator());
        minutesUnit.updateValueAndValidity(); // To trigger the new validators.

        this.stateChanges.next();
    }

    // To handle disabled property on form field.
    @Input()
    get disabled() {
        return this._disabled;
    }
    set disabled(dis) {
        this._disabled = coerceBooleanProperty(dis);

        if (this._disabled) {
            this.parts.disable();
        } else {
            this.parts.enable();
        }

        this.stateChanges.next();
    }

    // To handle aria description
    setDescribedByIds(ids: string[]) {
        this.describedBy = ids.join(" ");
    }

    // To handle onClick event on form field container when it's not directly on an input
    onContainerClick(event: MouseEvent) {
        if ((event.target as Element).tagName.toLowerCase() !== "input") {
            this.focusLastInput("mouse");
        }
    }

    emitChanges() {
        if (this.previousTime !== this.value) {
            this.shouldManuallyTriggerChangeEvent = true;
        }
        this.stateChanges.next();
        this.propagateChange(this.value);
        this.previousTime = this.value;
    }

    ////////////////////////////////////////////////////////////////////////////
    // For the ngModel two way binding
    writeValue(value: Duration | null) {
        this.value = value;
    }

    registerOnChange(fn) {
        this.propagateChange = fn;
    }

    registerOnTouched(fn) {
        this.propagateTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this._renderer.setProperty(
            this.elRef.nativeElement,
            "disabled",
            isDisabled
        );
        this.disabled = isDisabled;
    }
}
