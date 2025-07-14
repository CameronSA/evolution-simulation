import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';
import { NumberSliderComponent } from './components/number-slider/number-slider.component';
import { Bacterium } from './three/bacterium';
import { Food } from './three/food';
import { Simulation } from './three/simulation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LeaderboardComponent, NumberSliderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'evolution-simulation';

  bacteria: Bacterium[] = [];
  food: Food[] = [];
  leaderboard: { colour: string; bacteria: number }[] = [];

  constructor(private readonly simulation: Simulation) {}

  ngOnInit(): void {
    this.simulation.startSimulation('threeCanvas');
    this.simulation.bacteria$.subscribe((val) => this.updateBacteria(val));
    this.simulation.food$.subscribe((val) => (this.food = val));
  }

  onInitialSizeChanged($event: number) {
    let parameters = this.simulation.getSimulationParameters();
    parameters.startingBacteriumTraits.size = $event;
    this.simulation.updateSimulationParameters(parameters);
  }

  onInitialSpeedChanged($event: number) {
    let parameters = this.simulation.getSimulationParameters();
    parameters.startingBacteriumTraits.speed = $event;
    this.simulation.updateSimulationParameters(parameters);
  }

  onInitialSightRangeChanged($event: number) {
    let parameters = this.simulation.getSimulationParameters();
    parameters.startingBacteriumTraits.sightRange = $event;
    this.simulation.updateSimulationParameters(parameters);
  }

  onInitialAwarenessRangeChanged($event: number) {
    let parameters = this.simulation.getSimulationParameters();
    parameters.startingBacteriumTraits.awarenessRange = $event;
    this.simulation.updateSimulationParameters(parameters);
  }

  onInitialFoodCountChanged($event: number) {
    let parameters = this.simulation.getSimulationParameters();
    parameters.startingFoodCount = $event;
    this.simulation.updateSimulationParameters(parameters);
  }

  onInitialFoodReplenishmentRateChanged($event: number) {
    let parameters = this.simulation.getSimulationParameters();
    parameters.foodReplenishmentRatePerSecond = $event;
    this.simulation.updateSimulationParameters(parameters);
  }

  private updateBacteria(bacteria: Bacterium[]) {
    this.bacteria = bacteria;

    const leaderboardDict: Record<string, number> = {};
    for (const bacterium of bacteria) {
      const colour = bacterium.getColour();
      if (colour in leaderboardDict) {
        leaderboardDict[colour]++;
      } else {
        leaderboardDict[colour] = 1;
      }
    }

    this.leaderboard = [];
    for (const leaderboardItem in leaderboardDict) {
      this.leaderboard.push({
        colour: leaderboardItem,
        bacteria: leaderboardDict[leaderboardItem],
      });
    }

    this.leaderboard.sort((a, b) => b.bacteria - a.bacteria);
  }
}
