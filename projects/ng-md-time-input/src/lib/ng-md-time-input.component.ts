import {
    Component,
    ChangeDetectionStrategy,
    ElementRef,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Renderer2,
    Self,
    ViewChild,
    DoCheck
} from "@angular/core";
import {
    ControlValueAccessor,
    FormBuilder,
    FormGroup,
    NgControl,
    Validators,
    ValidatorFn
} from "@angular/forms";
import {
    MatFormFieldControl,
    ErrorStateMatcher,
    CanUpdateErrorState
} from "@angular/material";
import { FocusMonitor, FocusOrigin } from "@angular/cdk/a11y";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { Subject, Subscription } from "rxjs";
// Control state management
import { _TimeInputMixinBase } from "./control-state";
// Moment
import { Duration, Moment } from "moment";
// Time Adapters
import { TimeInputAdapter } from "./adapters";
import { TimeFormatter } from "./formatters";
import { TimeInputModel, TemporalObjectDescriptor } from './model/time-input.model';

@Component({
    selector: "ng-md-time-input",
    templateUrl: "./ng-md-time-input.component.html",
    styleUrls: ["./ng-md-time-input.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: "textbox",
        "[attr.id]": "id",
        "[attr.aria-required]": "required.toString()",
        "[attr.aria-disabled]": "disabled.toString()",
        "[attr.aria-invalid]": "errorState",
        "[attr.aria-describedby]": "describedBy || null",
        "[class.ng-md-time-input-disabled]": "disabled",
        "[class.ng-md-time-input-invalid]": "errorState",
        "[class.ng-md-time-input-required]": "required",
        class: "ng-md-time-input"
    },
    providers: [
        { provide: MatFormFieldControl, useExisting: NgMdTimeInputComponent }
    ],
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
    // Time management
    model = new TimeInputModel();
    // Form element management
    private _preventFocusLoss = false;
    private subscriptions: Subscription[] = [];
    stateChanges = new Subject<void>();
    @ViewChild("minutesUnit") minutesUnit: ElementRef;
    @ViewChild("minutesDecimal") minutesDecimal: ElementRef;
    @ViewChild("hoursUnit") hoursUnit: ElementRef;
    @ViewChild("hoursDecimal") hoursDecimal: ElementRef;
    @ViewChild("daysUnit") daysUnit: ElementRef;
    @ViewChild("daysDecimal") daysDecimal: ElementRef;
    // For the change event
    private previousTime: Duration | Moment | Date = null;
    private shouldManuallyTriggerChangeEvent: boolean;
    //////////////////////////////////////////////////////////////////
    // For Mat Form Field
    // Used by Angular Material to map hints and errors to the control.
    id = `time-input-${NgMdTimeInputComponent.nextId++}`;
    // Used by Angular Material to bind Aria ids to our control
    describedBy = "";

    parts: FormGroup;
    private _placeholder: string;
    focused = false;
    private _required = false;
    private _disabled = false;
    controlType = "time-input"; // Class identifier for this control will be mat-form-field-time-input.

    // NgModel
    propagateChange = (_: any) => {};
    propagateTouched = () => {};

    constructor(
        private elRef: ElementRef,
        fb: FormBuilder,
        private fm: FocusMonitor,
        private formatter: TimeFormatter,
        @Optional()
        @Self()
        public ngControl: NgControl,
        private _renderer: Renderer2,
    ) {
        // Form initialization. On top of a directive that prevents the input of non
        // numerical char, we add a pattern to assure that only numbers are allowed.
        this.parts = fb.group({
            daysDecimal: ["", Validators.pattern(/[0-9]/)],
            daysUnit: ["", Validators.pattern(/[0-9]/)],
            hoursDecimal: ["", Validators.pattern(/[0-9]/)],
            hoursUnit: ["", Validators.pattern(/[0-9]/)],
            minutesDecimal: ["", Validators.pattern(/[0-9]/)],
            minutesUnit: ["", this.getMinutesUnitValidator()]
        });

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
        return this.model.getTemporalObject();
    }
    set value(time: Duration | Moment | Date | null) {
        if (time) {
            this.model.setTemporalObject(time);
        } else {
            this.model.setTemporalObject(null);
        }
        // Sets the time to display in the proper format.
        this.formatDislayedTime();

        this.emitChanges();
        this.shouldManuallyTriggerChangeEvent = false;
    }

    set showDays(showDays: boolean) {
        this.model.handleDays = showDays;
        this.formatDislayedTime();
    }
    get showDays(): boolean {
        return this.model.handleDays;
    }

    set timeAdapter(adapter: TimeInputAdapter<Duration | Moment | Date>) {
        const currentTime = this.model.getTemporalObject();
        // Check if the current time object matches the new adapter.
        if (currentTime && !adapter.isValid(currentTime)) {
            // If it is not the case, log an error
            throw new Error(
                "The given TimeInputAdapter does not match the current NgModel value type."
            );
        }
        else if(!currentTime) {
            this.model.setTemporalObject(null, adapter);
            // Sets the time to display in the proper format.
            this.formatDislayedTime();
        }
        // Otherwise, the adapter hasn't change so ignore the action.
    }

    get timeAdapter(): TimeInputAdapter<Duration | Moment | Date> {
        return this.model.temporalObjectAdapter;
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
            this.parts
                .get("daysDecimal")
                .setValue(days.charAt(days.length - 2));
            this.parts.get("daysUnit").setValue(days.charAt(days.length - 1));
        } else {
            this.parts.get("daysDecimal").setValue("");
            this.parts.get("daysUnit").setValue("");
        }
    }
    get displayedDays(): string {
        return (
            this.parts.get("daysDecimal").value +
            this.parts.get("daysUnit").value
        );
    }

    /**
     * Sets the displayed hours to the given value.
     * Note: This affectation will not change the ngModel value.
     */
    set displayedHours(hours: string) {
        this.parts.get("hoursDecimal").setValue(hours.charAt(hours.length - 2));
        this.parts.get("hoursUnit").setValue(hours.charAt(hours.length - 1));
    }
    get displayedHours(): string {
        return (
            this.parts.get("hoursDecimal").value +
            this.parts.get("hoursUnit").value
        );
    }

    /**
     * Sets the displayed minutes to the given value.
     * Note: This affectation will not change the ngModel value.
     */
    set displayedMinutes(minutes: string) {
        this.parts
            .get("minutesDecimal")
            .setValue(minutes.charAt(minutes.length - 2));
        this.parts
            .get("minutesUnit")
            .setValue(minutes.charAt(minutes.length - 1));
    }
    get displayedMinutes(): string {
        return (
            this.parts.get("minutesDecimal").value +
            this.parts.get("minutesUnit").value
        );
    }

    ////////////////////////////////////////////////////////////////////////////
    // Time management
    /**
     * Updates both the ngModel time and the displayed time of the control with the values
     * currently displayed in the time input.
     */
    updateTime(): void {
        this.updateDisplayedTime();
        this.model.updateTime(
            this.displayedDays,
            this.displayedHours,
            this.displayedMinutes
        );
        this.emitChanges();
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
     * This function takes the time and formats it to a padded format.
     * If the time is not a duration, it will set it to an empty string.
     */
    private formatDislayedTime() {
        const { days, hours, minutes} = this.formatter.formatDislayedTime(
            this.model.getTemporalObject(),
            this.model.temporalObjectAdapter,
            this.showDays
        );

        this.displayedDays = days;
        this.displayedHours = hours;
        this.displayedMinutes = minutes;
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
    handleKeydown(event: KeyboardEvent, targettedInputName: string): void {
        // On up arrow, we want to increment the targetted input
        if (event.key === "ArrowUp" || event.key === "Up") {
            this.incrementTime(targettedInputName, false);
            event.preventDefault(); // Prevents the carret from moving to the lefthand of the input
            // event.stopPropagation(); // prevents the carret from moving
            return;
        }
        // On down arrow, we want to decrement the targetted input
        else if (event.key === "ArrowDown" || event.key === "Down") {
            this.incrementTime(targettedInputName, true);
            event.preventDefault(); // Prevents the carret from moving to the righthand of the input
            // event.stopPropagation(); // prevents the carret from moving
            return;
        }
        // On left arrow, we want to move the carret to the left sibling of the targetted input
        else if (event.key === "ArrowLeft" || event.key === "Left") {
            const leftSibling = this.getLeftSiblingOfInput(targettedInputName);
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
                targettedInputName
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
     * Increments or decrements the given input.
     */
    incrementTime(inputName: string, isDecrement: boolean) {
        const fieldDescriptor = this.getDescriptor(inputName);

        if(!isDecrement) {
            this.model.incrementTime(fieldDescriptor);
        }
        else {
            this.model.decrementTime(fieldDescriptor);
        }

        // Once the ngModel is updated, update the displayed time.
        this.formatDislayedTime();
        this.emitChanges();
        // Since the inputs are not recognizing the increment as an input event, we got to manually trigger one.
        const inputEvent = this.newEvent("input");
        this.elRef.nativeElement.dispatchEvent(inputEvent);
    }

    /**
     * @returns An object that flags what is the input matching the inputName.
     */
    private getDescriptor(inputName: string): Partial<TemporalObjectDescriptor> {
        const descriptor: Partial<TemporalObjectDescriptor> = {};

        switch (inputName) {
            case "daysDecimal":
                descriptor.daysDecimal = true;
                break;
            case "daysUnit":
                descriptor.days = true;
                break;
            case "hoursDecimal":
                descriptor.hoursDecimal = true;
                break;
            case "hoursUnit":
                descriptor.hours = true;
                break;
            case "minutesDecimal":
                descriptor.minutesDecimal = true;
                break;
            case "minutesUnit":
                descriptor.minutes = true;
                break;
            default:
                throw new Error("Invalid input name.");
        }

        return descriptor;
    }

    private getLeftSiblingOfInput(inputName: string): ElementRef | null {
        switch (inputName) {
            case "daysDecimal":
                return null;
            case "daysUnit":
                return this.daysDecimal;
            case "hoursDecimal":
                return this.daysUnit;
            case "hoursUnit":
                return this.hoursDecimal;
            case "minutesDecimal":
                return this.hoursUnit;
            case "minutesUnit":
                return this.minutesDecimal;
        }
    }
    private getRightSiblingOfInput(inputName: string): ElementRef | null {
        switch (inputName) {
            case "daysDecimal":
                return this.daysUnit;
            case "daysUnit":
                return this.hoursDecimal;
            case "hoursDecimal":
                return this.hoursUnit;
            case "hoursUnit":
                return this.minutesDecimal;
            case "minutesDecimal":
                return this.minutesUnit;
            case "minutesUnit":
                return null;
        }
    }

    /**
     * Focuses the last input in the control.
     */
    focusLastInput(origin: FocusOrigin): void {
        this.focusInput(this.minutesUnit.nativeElement, origin);
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
     * This function is to put the cursor at the end of input to prevent undesirable behaviour when the cursor is at the beginning
     */
    onClick(event: any) {
        const val = event.target.value;

        if (val) {
            const len = event.target.value.length;
            event.target.setSelectionRange(len, len);
        }
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
        return !this.model.getTemporalObject() || !this.model.isModelValid();
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
        this.parts
            .get("minutesUnit")
            .setValidators(this.getMinutesUnitValidator());
        this.parts.get("minutesUnit").updateValueAndValidity(); // To trigger the new validators.

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

    /**
     * Disables the select. Part of the ControlValueAccessor interface required
     * to integrate with Angular's core forms API.
     *
     * @param isDisabled Sets whether the component is disabled.
     */
    setDisabledState(isDisabled: boolean): void {
        this._renderer.setProperty(
            this.elRef.nativeElement,
            "disabled",
            isDisabled
        );
        this.disabled = isDisabled;
        this.stateChanges.next();
    }
}
