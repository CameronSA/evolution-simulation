import { Injectable } from '@angular/core';
import { throttle } from 'lodash-es';
import { Subject } from 'rxjs';
import * as THREE from 'three';
import { Action, Bacterium, BacteriumTraits } from './bacterium';
import { Food } from './food';

export interface SimulationParameters {
  startingBacteriumTraits: BacteriumTraits;
  startingFoodCount: number;
  foodReplenishmentRatePerSecond: number;
}

@Injectable({
  providedIn: 'root',
})
export class Simulation {
  private lastRenderTime: number = new Date().getTime();
  private lastFoodUpdateTime: number = new Date().getTime();
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  private readonly FPS = 60;

  private bacteria: Bacterium[] = [];
  private food: Food[] = [];

  private bacteriaSubject = new Subject<Bacterium[]>();
  public bacteria$ = this.bacteriaSubject.asObservable();

  private foodSubject = new Subject<Food[]>();
  public food$ = this.foodSubject.asObservable();

  private startingTraits: BacteriumTraits = {
    size: 0.2,
    speed: 0.01,
    sightRange: 0.1,
    awarenessRange: Math.PI / 4,
  };

  private startingFoodCount = 300;

  private foodReplenishmentRatePerSecond = 2;

  getSimulationParameters(): SimulationParameters {
    return {
      startingBacteriumTraits: this.startingTraits,
      startingFoodCount: this.startingFoodCount,
      foodReplenishmentRatePerSecond: this.foodReplenishmentRatePerSecond,
    };
  }

  updateSimulationParameters(parameters: SimulationParameters) {
    this.startingTraits = parameters.startingBacteriumTraits;
    this.startingFoodCount = parameters.startingFoodCount;
    this.foodReplenishmentRatePerSecond =
      parameters.foodReplenishmentRatePerSecond;
  }

  startSimulation(containerElementId: string) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer();
    this.container = document.getElementById(containerElementId) as HTMLElement;

    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
    this.renderer.setPixelRatio(devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(light);

    this.reset();

    this.camera.position.z = 7;

    const animate = () => {
      const currentTime = new Date().getTime();
      if (currentTime - this.lastRenderTime > 1000 / this.FPS) {
        this.lastRenderTime += 1000 / this.FPS;
        this.renderer!.render(this.scene!, this.camera!);
        const result = this.processBacteriaActions(this.bacteria, this.food);
        this.bacteria = result.bacteria;
        this.food = result.food;
      }

      const timeInterval = 1000 / this.foodReplenishmentRatePerSecond;
      if (currentTime - this.lastFoodUpdateTime > timeInterval) {
        // Top up the food
        const position = this.getRandomPosition();
        const foodItem = new Food(position.x, position.y);
        this.scene?.add(foodItem.getMesh());
        this.food.push(foodItem);
        this.lastFoodUpdateTime = currentTime;
      }

      this.bacteriaSubject.next(this.bacteria);
      this.foodSubject.next(this.food);
    };

    this.renderer.setClearColor(0xeeeeee);
    this.renderer.setAnimationLoop(animate);

    window.addEventListener(
      'resize',
      throttle(
        () => {
          let aspectRatio =
            this.container?.offsetWidth! / this.container?.offsetHeight!;
          this.camera!.aspect = aspectRatio;
          this.camera!.updateProjectionMatrix();
          this.renderer!.setSize(
            this.container?.offsetWidth!,
            this.container?.offsetHeight!
          );
        },
        1000 / this.FPS,
        { trailing: true }
      ),
      false
    );
  }

  reset() {
    for (const bacterium of this.bacteria) {
      bacterium.delete();
    }

    for (const foodItem of this.food) {
      foodItem.delete();
    }

    this.bacteria = this.renderBacteria();
    this.food = this.renderFood();

    this.bacteriaSubject.next(this.bacteria);
    this.foodSubject.next(this.food);
  }

  private renderFood(): Food[] {
    if (!this.scene || !this.renderer || !this.camera) {
      return [];
    }

    const food: Food[] = [];
    for (let i = 0; i < this.startingFoodCount; i++) {
      const position = this.getRandomPosition();
      const foodItem = new Food(position.x, position.y);
      food.push(foodItem);
      this.scene.add(foodItem.getMesh());
    }

    return food;
  }

  private renderBacteria(): Bacterium[] {
    if (!this.scene || !this.renderer || !this.camera) {
      return [];
    }

    // To avoid overlaps,
    // split the screen into equal squares
    // and place the bacteria in random squares
    const sceneSquares: { x: number; y: number }[] = [];
    for (let i = -5; i < 5; i++) {
      for (let j = -5; j < 5; j++) {
        sceneSquares.push({ x: i, y: j });
      }
    }

    const renderChance = 0.5; // 50% chance to render a bacterium in each square
    const bacteria: Bacterium[] = [];
    for (let sceneSquare of sceneSquares) {
      if (Math.random() > renderChance) {
        continue;
      }

      const sceneSquarePosition = this.getRandomPosition();
      const position = {
        x: sceneSquarePosition.x / 10 + sceneSquare.x,
        y: sceneSquarePosition.y / 10 + sceneSquare.y,
      };

      const bacterium = new Bacterium(
        this.startingTraits,
        this.getRandomColor(),
        position.x,
        position.y
      );

      bacteria.push(bacterium);
      this.scene.add(bacterium.getMesh());
    }

    return bacteria;
  }

  private getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  private getRandomPosition(): { x: number; y: number } {
    return {
      x: (Math.floor(Math.random() * 90) - 45) / 10,
      y: (Math.floor(Math.random() * 90) - 45) / 10,
    };
  }

  private processBacteriaActions(
    bacteria: Bacterium[],
    food: Food[]
  ): { bacteria: Bacterium[]; food: Food[] } {
    const bacteriaIdsToRemove: string[] = [];
    const foodIdsToRemove: string[] = [];
    const bacteriaToAdd: Bacterium[] = [];

    for (const bacterium of bacteria) {
      const actionResult = bacterium.act(bacteria, food);
      if (actionResult.action === Action.Die) {
        bacterium.delete();
        bacteriaIdsToRemove.push(bacterium.id);
      } else if (actionResult.action === Action.Reproduce) {
        this.scene?.add(actionResult.newBacterium!.getMesh());
        bacteriaToAdd.push(actionResult.newBacterium!);
      } else if (actionResult.action === Action.EatFood) {
        actionResult.eatenFood!.delete();
        foodIdsToRemove.push(actionResult.eatenFood!.id);
      }
    }

    const newBacteriaList: Bacterium[] = [];
    for (const bacterium of bacteria) {
      if (!bacteriaIdsToRemove.includes(bacterium.id)) {
        newBacteriaList.push(bacterium);
      }
    }

    const newFoodList: Food[] = [];
    for (const foodItem of food) {
      if (!foodIdsToRemove.includes(foodItem.id)) {
        newFoodList.push(foodItem);
      }
    }

    return {
      bacteria: [...newBacteriaList, ...bacteriaToAdd],
      food: newFoodList,
    };
  }
}
