import * as THREE from 'three';
import { Food } from './food';

enum MutationType {
  size, // Larger bacteria can consume smaller bacteria
  speed, // Faster bacteria can escape predators and/or catch prey
  sight, // Bacteria with better sight can see further
  awareness, // Bacteria with better awareness can detect threats or food more easily
}

export enum Action {
  None,
  Reproduce,
  Die,
  EatFood,
}

export interface ActionResult {
  action: Action;
  newBacterium?: Bacterium; // Only used if action is Reproduce
  eatenFood?: Food; // Only used if action is EatFood
}

export interface BacteriumTraits {
  size: number;
  speed: number;
  sightRange: number; // How far the bacterium can see
  awarenessRange: number; // How wide the bacterium's vision is, in radians
}

export class Bacterium {
  id: string = crypto.randomUUID();
  private traits: BacteriumTraits;
  private energy: number = 1000; // Each action consumes 1 energy. If energy reaches 0, the bacterium dies.
  private facingDirection: THREE.Vector2; // Direction the bacterium is facing

  private color: string;
  private mesh: THREE.Mesh;

  constructor(
    traits: BacteriumTraits,
    color: string,
    positionX: number,
    positionY: number
  ) {
    this.traits = traits;
    this.color = color;

    this.facingDirection = new THREE.Vector2(
      this.randomUnit(),
      this.randomUnit()
    ).normalize();

    this.mesh = this.createMesh(positionX, positionY);
  }

  getColour() {
    return this.color;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  act(bacteria: Bacterium[], food: Food[]): ActionResult {
    if (this.energy <= 0) {
      return { action: Action.Die };
    }

    if (this.energy > 5000) {
      const newBacterium = new Bacterium(
        this.traits,
        this.color,
        this.mesh.position.x,
        this.mesh.position.y
      );

      if (Math.random() >= 0.5) {
        newBacterium.mutate();
      }

      this.energy -= 4000; // Reproducing costs energy
      return {
        action: Action.Reproduce,
        newBacterium: newBacterium,
      };
    }

    const filteredBacteria = this.sortBacteriaByDistance(
      bacteria.filter((b) => b.id !== this.id)
    );

    const predator = this.lookForPredators(filteredBacteria);
    if (predator) {
      if (this.attemptEscape(predator)) {
        this.energy -= 10; // Escaping costs energy
        return { action: Action.None }; // Successfully escaped
      } else {
        return { action: Action.Die }; // Failed to escape, bacterium dies
      }
    }

    const prey = this.lookForPrey(filteredBacteria);
    if (prey) {
      if (this.attemptToEat(prey.getMesh(), 0.9)) {
        this.energy += 2000; // Consuming prey gives energy
        return { action: Action.None };
      } else {
        this.energy -= 1; // Attempting to catch prey costs energy
        return { action: Action.None };
      }
    }

    food = this.sortFoodByDistance(food);

    const foodItem = this.lookForFood(food);
    if (foodItem) {
      if (this.attemptToEat(foodItem.getMesh(), 1)) {
        this.energy += 1000; // Consuming food gives energy
        return {
          action: Action.EatFood,
          eatenFood: foodItem,
        };
      } else {
        this.energy -= 1; // Attempting to eat food costs energy
        return { action: Action.None };
      }
    }

    // If no actions were taken, move in a random direction
    this.facingDirection = new THREE.Vector2(
      this.facingDirection.x + this.randomUnit() / 10,
      this.facingDirection.y + this.randomUnit() / 10
    ).normalize();
    this.move();
    this.energy -= 1;
    return { action: Action.None };
  }

  mutate() {
    if (Math.random() < 0.2) {
      return;
    }

    const mutationType = Math.floor(
      Math.random() * Object.keys(MutationType).length
    );

    //TODO: guard against negative values
    switch (mutationType) {
      case MutationType.size:
        this.traits.size += Math.random() / 2 - 0.25;
        this.createMesh(this.mesh.position.x, this.mesh.position.y);
        break;
      case MutationType.speed:
        this.traits.speed += Math.random() / 50 - 0.01;
        break;
      case MutationType.sight:
        this.traits.sightRange += Math.random() / 2 - 0.25;
        break;
      case MutationType.awareness:
        this.traits.awarenessRange += Math.random() / 2 - 0.25;
        break;
    }
  }

  delete() {
    this.mesh.geometry.dispose();
    this.mesh.parent?.remove(this.mesh);
  }

  // TODO: merge these two methods by getting Food and Bacteria to inherit from an interface and using generics
  private sortFoodByDistance(food: Food[]): Food[] {
    const distances: { food: Food; distance: number }[] = [];

    for (let foodItem of food) {
      const foodPosition = foodItem.getMesh().position;
      const xDistance = this.mesh.position.x - foodPosition.x;
      const yDistance = this.mesh.position.y - foodPosition.y;

      const distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);
      distances.push({ food: foodItem, distance: distance });
    }

    distances.sort((a, b) => a.distance - b.distance);

    return distances.map((x) => x.food);
  }

  private sortBacteriaByDistance(bacteria: Bacterium[]): Bacterium[] {
    const distances: { bacterium: Bacterium; distance: number }[] = [];

    for (let bacterium of bacteria) {
      const bacteriumPosition = bacterium.getMesh().position;
      const xDistance = this.mesh.position.x - bacteriumPosition.x;
      const yDistance = this.mesh.position.y - bacteriumPosition.y;

      const distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);
      distances.push({ bacterium: bacterium, distance: distance });
    }

    distances.sort((a, b) => a.distance - b.distance);

    return distances.map((x) => x.bacterium);
  }

  private createMesh(positionX: number, positionY: number): THREE.Mesh {
    const shape = new THREE.Shape();

    const sign = this.traits.size < 0 ? -1 : 1;

    shape.moveTo(
      (-sign * this.traits.size) / 2,
      (-sign * this.traits.size) / 2
    );
    shape.lineTo((-sign * this.traits.size) / 2, (sign * this.traits.size) / 2);
    shape.lineTo((sign * this.traits.size) / 2, (sign * this.traits.size) / 2);
    shape.lineTo(sign * this.traits.size, 0);
    shape.lineTo((sign * this.traits.size) / 2, (-sign * this.traits.size) / 2);
    shape.lineTo(
      (-sign * this.traits.size) / 2,
      (-sign * this.traits.size) / 2
    );

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.set(positionX, positionY, 0);
    this.rotateToFace(this.facingDirection);

    return this.mesh;
  }

  private randomUnit() {
    return Math.random() * 2 - 1;
  }

  private lookForPredators(bacteria: Bacterium[]): Bacterium | undefined {
    for (const bacterium of bacteria) {
      // Only need to flee if the bacterium is capable of consuming this bacterium
      if (bacterium.traits.size <= this.traits.size) {
        continue;
      }

      const mesh = bacterium.getMesh();
      const canSee = this.isWithinSightRange(mesh, this.traits.sightRange);
      const canDetect = this.isWithinAwarenessRange(
        mesh,
        this.traits.awarenessRange
      );

      if (canSee && canDetect) {
        return bacterium;
      }
    }

    return undefined;
  }

  private attemptEscape(predator: Bacterium): boolean {
    const predatorPosition = predator.getMesh().position;
    const bacteriumPosition = this.mesh.position;

    this.facingDirection = new THREE.Vector2(
      bacteriumPosition.x - predatorPosition.x,
      bacteriumPosition.y - predatorPosition.y
    ).normalize();

    this.rotateToFace(this.facingDirection);

    if (this.hasSameLocation(predator.getMesh())) {
      return false;
    }

    let newXPosition =
      this.mesh.position.x + this.facingDirection.x * this.traits.speed;
    let newYPosition =
      this.mesh.position.y + this.facingDirection.y * this.traits.speed;

    if (newXPosition > 5 || newXPosition < -5) {
      this.facingDirection.x = -this.facingDirection.x;
    }
    if (newYPosition > 5 || newYPosition < -5) {
      this.facingDirection.y = -this.facingDirection.y;
    }

    this.mesh.position.x = newXPosition;
    this.mesh.position.y = newYPosition;

    return true;
  }

  private move() {
    let newXPosition =
      this.mesh.position.x + this.facingDirection.x * this.traits.speed;
    let newYPosition =
      this.mesh.position.y + this.facingDirection.y * this.traits.speed;

    if (newXPosition > 5 || newXPosition < -5) {
      this.facingDirection.x = -this.facingDirection.x;
    }
    if (newYPosition > 5 || newYPosition < -5) {
      this.facingDirection.y = -this.facingDirection.y;
    }

    this.mesh.position.x = newXPosition;
    this.mesh.position.y = newYPosition;

    this.rotateToFace(this.facingDirection);
  }

  private lookForFood(food: Food[]): Food | undefined {
    for (const foodItem of food) {
      const mesh = foodItem.getMesh();
      const canSee = this.isWithinSightRange(mesh, this.traits.sightRange);
      const canDetect = this.isWithinAwarenessRange(
        mesh,
        this.traits.awarenessRange
      );

      if (canSee && canDetect) {
        return foodItem;
      }
    }

    return undefined;
  }

  private lookForPrey(bacteria: Bacterium[]): Bacterium | undefined {
    for (const bacterium of bacteria) {
      if (bacterium.traits.size >= this.traits.size) {
        continue; // Only prey on smaller bacteria
      }

      const mesh = bacterium.getMesh();
      const canSee = this.isWithinSightRange(mesh, this.traits.sightRange);
      const canDetect = this.isWithinAwarenessRange(
        mesh,
        this.traits.awarenessRange
      );

      if (canSee && canDetect) {
        return bacterium;
      }
    }

    return undefined;
  }

  private attemptToEat(food: THREE.Mesh, successChance: number): boolean {
    this.facingDirection = new THREE.Vector2(
      food.position.x - this.mesh.position.x,
      food.position.y - this.mesh.position.y
    ).normalize();

    this.move();

    if (this.hasSameLocation(food)) {
      return Math.random() < successChance;
    }

    return false;
  }

  private isWithinSightRange(item: THREE.Mesh, range: number): boolean {
    const itemPosition = item.position;
    const bacteriumPosition = this.mesh.position;

    const xDistance = Math.abs(itemPosition.x - bacteriumPosition.x);
    const yDistance = Math.abs(itemPosition.y - bacteriumPosition.y);
    const distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

    return distance <= range;
  }

  private isWithinAwarenessRange(item: THREE.Mesh, range: number): boolean {
    const itemPosition = item.position;
    const bacteriumPosition = this.mesh.position;

    const cosTheta =
      itemPosition.dot(bacteriumPosition) /
      (itemPosition.length() * bacteriumPosition.length());

    const angle = Math.acos(cosTheta);

    return angle <= range;
  }

  private hasSameLocation(item: THREE.Mesh): boolean {
    const bacteriumPosition = this.mesh.position;
    const itemPosition = item.position;

    const xDiff = bacteriumPosition.x - itemPosition.x;
    const yDiff = bacteriumPosition.y - itemPosition.y;
    const tolerance = this.traits.speed;
    return Math.abs(xDiff) < tolerance && Math.abs(yDiff) < tolerance;
  }

  private rotateToFace(direction: THREE.Vector2) {
    let angle = Math.atan2(direction.y, direction.x);

    this.mesh.rotation.z = angle;
  }
}
