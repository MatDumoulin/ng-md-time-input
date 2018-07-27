import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material';
import { NgMdTimeInputComponent } from './ng-md-time-input.component';
import { OnlyNumberDirective } from './only-number.directive';
import { TimeFormatter } from './formatters';
// import { TimeFactoryService } from './time-factory.service';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
  declarations: [
    OnlyNumberDirective,
    NgMdTimeInputComponent
  ],
  exports: [
    NgMdTimeInputComponent
  ],
  providers: [
    TimeFormatter
  ]
})
export class NgMdTimeInputModule { }
