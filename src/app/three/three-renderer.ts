import { Injectable } from '@angular/core';
import { throttle } from 'lodash-es';
import * as THREE from 'three';
import { Action, Bacterium } from './bacterium';
import { Food } from './food';

@Injectable({
  providedIn: 'root',
})
export class ThreeRenderer {
  private lastRenderTime: number = new Date().getTime();
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  private readonly FPS = 60;

  initThreeRenderer(containerElementId: string) {
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(light);

    let bacteria = this.renderBacteria();
    let food = this.renderFood();

    this.camera.position.z = 7;

    const animate = () => {
      const currentTime = new Date().getTime();
      if (currentTime - this.lastRenderTime > 1000 / this.FPS) {
        this.lastRenderTime += 1000 / this.FPS;
        this.renderer!.render(this.scene!, this.camera!);
        const result = this.processBacteriaActions(bacteria, food);
        bacteria = result.bacteria;
        food = result.food;
      }
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

  private renderFood(): Food[] {
    if (!this.scene || !this.renderer || !this.camera) {
      return [];
    }

    const foodCount = 100; // Number of food items to render
    const food: Food[] = [];
    for (let i = 0; i < foodCount; i++) {
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
        this.getRandomSize(),
        this.getRandomColor(),
        position.x,
        position.y
      );

      bacteria.push(bacterium);
      this.scene.add(bacterium.getMesh());
    }

    return bacteria;

    // const bacterium = new Bacterium(0.5, this.getRandomColor(), 0, 0);
    // this.scene.add(bacterium.getMesh());

    // return [bacterium];
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

  private getRandomSize(): number {
    return Math.random() / 3 + 0.05;
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
