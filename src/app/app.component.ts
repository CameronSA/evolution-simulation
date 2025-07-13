import { Component, OnInit } from '@angular/core';
import { Bacterium } from './three/bacterium';
import { Food } from './three/food';
import { ThreeRenderer } from './three/three-renderer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'evolution-simulation';

  bacteria: Bacterium[] = [];
  food: Food[] = [];

  constructor(private readonly threeRenderer: ThreeRenderer) {}

  ngOnInit(): void {
    this.threeRenderer.initThreeRenderer('threeCanvas');
    this.threeRenderer.bacteria$.subscribe((val) => (this.bacteria = val));
  }
}
