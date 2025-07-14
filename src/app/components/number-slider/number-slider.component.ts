import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-number-slider',
  standalone: true,
  imports: [MatSliderModule],
  templateUrl: './number-slider.component.html',
  styleUrl: './number-slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberSliderComponent {
  @Output() valueChangedEvent = new EventEmitter<number>();

  @Input()
  minimum!: number;

  @Input()
  maximum!: number;

  @Input()
  step!: number;

  @Input()
  default!: number;

  @Input()
  name!: string;

  @Input()
  displayMultiplier!: number;

  onChange(value: string) {
    this.valueChangedEvent.emit(Number(value) / this.displayMultiplier);
  }

  toDisplayable(value: string): string {
    if (!value.includes('.') && !value.includes(',')) {
      return value;
    }

    const number = Number(value);
    return number.toFixed(2);
  }
}
