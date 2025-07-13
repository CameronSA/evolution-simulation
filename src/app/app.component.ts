import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Bacterium } from './three/bacterium';
import { Food } from './three/food';
import { ThreeRenderer } from './three/three-renderer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'evolution-simulation';

  bacteria: Bacterium[] = [];
  food: Food[] = [];
  leaderboard: {colour:string,bacteria:number}[]=[];

  constructor(private readonly threeRenderer: ThreeRenderer) {}

  ngOnInit(): void {
    this.threeRenderer.initThreeRenderer('threeCanvas');
    this.threeRenderer.bacteria$.subscribe((val) => this.updateBacteria(val));
    this.threeRenderer.food$.subscribe((val) => (this.food = val));
  }

  private updateBacteria(bacteria: Bacterium[]) {
    this.bacteria = bacteria;

    const leaderboardDict: Record<string,number>={};
    for (const bacterium of bacteria) {
      const colour = bacterium.getColour();
      if (colour in leaderboardDict) {
        leaderboardDict[colour]++;
      } else {
        leaderboardDict[colour] = 1
      }
    }

    this.leaderboard =[];
    for(const leaderboardItem in leaderboardDict){
      this.leaderboard.push({colour:leaderboardItem,bacteria:leaderboardDict[leaderboardItem]})
    }

    this.leaderboard.sort((a,b)=>b.bacteria - a.bacteria)
  }
}
