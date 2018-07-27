import { ErrorStateMatcher, mixinErrorState } from "@angular/material";
import { NgForm, FormGroupDirective, NgControl } from "@angular/forms";
// This import is needed even though it is not implicitly used in order to prevent
// a Exported variable '_TimeInputMixinBase' has or is using name 'CanUpdateErrorState'
// from external module but cannot be named.
import { CanUpdateErrorState } from "@angular/material";

// Boilerplate for applying mixins to NgMdTimeInput.
export class TimeInputBase {
    constructor(
        public _defaultErrorStateMatcher: ErrorStateMatcher,
        public _parentForm: NgForm,
        public _parentFormGroup: FormGroupDirective,
        public ngControl: NgControl
    ) {}
}
export const _TimeInputMixinBase = mixinErrorState(TimeInputBase);
