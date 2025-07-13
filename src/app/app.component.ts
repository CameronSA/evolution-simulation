import { Component, OnInit } from '@angular/core';
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

  constructor(private readonly threeRenderer: ThreeRenderer) {}

  ngOnInit(): void {
    this.threeRenderer.initThreeRenderer('threeCanvas');
  }
}
