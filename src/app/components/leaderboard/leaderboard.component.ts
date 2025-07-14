import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent {
  @Input() leaderboard: { colour: string; bacteria: number }[] = [];
}
