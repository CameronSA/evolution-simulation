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

export class Bacterium {
  id: string = crypto.randomUUID();
  private size: number;
  private speed: number;
  private sightRange: number; // How far the bacterium can see
  private awarenessRange: number; // How wide the bacterium's vision is, in radians
  private energy: number = 1000; // Each action consumes 1 energy. If energy reaches 0, the bacterium dies.
  private isPredator: boolean = false; // If true, this bacterium can consume other bacteria
  private facingDirection: THREE.Vector2; // Direction the bacterium is facing

  private color: string;
  private mesh: THREE.Mesh;

  constructor(
    size: number,
    color: string,
    positionX: number,
    positionY: number
  ) {
    this.size = size;
    this.color = color;
    this.speed = 0.01;
    this.sightRange = 0.1;
    this.awarenessRange = 0.1;

    this.facingDirection = new THREE.Vector2(
      this.randomUnit(),
      this.randomUnit()
    ).normalize();

    const shape = new THREE.Shape();
    shape.moveTo(-this.size / 2, -this.size / 2);
    shape.lineTo(-this.size / 2, this.size / 2);
    shape.lineTo(this.size / 2, this.size / 2);
    shape.lineTo(this.size, 0);
    shape.lineTo(this.size / 2, -this.size / 2);
    shape.lineTo(-this.size / 2, -this.size / 2);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(positionX, positionY, 0);
    this.rotateToFace(this.facingDirection);
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  act(bacteria: Bacterium[], food: Food[]): ActionResult {
    if (this.energy <= 0) {
      return { action: Action.Die };
    }

    if (this.energy > 2000) {
      const newBacterium = new Bacterium(
        this.size,
        this.color,
        this.mesh.position.x,
        this.mesh.position.y
      );

      if (Math.random() >= 0.5) {
        newBacterium.mutate();
      }

      this.energy -= 2000; // Reproducing costs energy
      return {
        action: Action.Reproduce,
        newBacterium: newBacterium,
      };
    }

    const filteredBacteria = bacteria.filter((b) => b.id !== this.id);
    const predator = this.lookForPredators(filteredBacteria);
    if (predator) {
      console.log('predator');
      if (this.attemptEscape(predator)) {
        this.energy -= 10; // Escaping costs energy
        return { action: Action.None }; // Successfully escaped
      } else {
        return { action: Action.Die }; // Failed to escape, bacterium dies
      }
    }

    if (this.isPredator) {
      const prey = this.lookForPrey(filteredBacteria);
      if (prey) {
        if (this.attemptToCatchPrey(prey)) {
          this.energy += 333; // Consuming prey gives energy
          return { action: Action.None };
        } else {
          this.energy -= 1; // Attempting to catch prey costs energy
          return { action: Action.None };
        }
      }
    } else {
      const foodItem = this.lookForFood(food);
      if (foodItem) {
        if (this.attemptToEatFood(foodItem)) {
          this.energy += 333; // Consuming food gives energy
          return {
            action: Action.EatFood,
            eatenFood: foodItem,
          };
        } else {
          this.energy -= 1; // Attempting to eat food costs energy
          return { action: Action.None };
        }
      }
    }

    // If no actions were taken, move in a random direction
    this.moveInRandomDirection();
    this.energy -= 1;
    return { action: Action.None };
  }

  mutate() {
    const mutationType = Math.floor(Math.random() * 3);

    function randomMutationIncrement() {
      // Returns a random value between -0.25 and 0.25
      return Math.random() / 2 - 0.25;
    }

    switch (mutationType) {
      case MutationType.size:
        this.size += randomMutationIncrement();
        break;
      case MutationType.speed:
        this.speed += randomMutationIncrement();
        break;
      case MutationType.sight:
        this.sightRange += randomMutationIncrement();
        break;
      case MutationType.awareness:
        this.awarenessRange += randomMutationIncrement();
        break;
    }
  }

  delete() {
    this.mesh.geometry.dispose();
    this.mesh.parent?.remove(this.mesh);
  }

  private randomUnit() {
    return Math.random() * 2 - 1;
  }

  private lookForPredators(bacteria: Bacterium[]): Bacterium | undefined {
    for (const bacterium of bacteria) {
      // Only need to flee if the bacterium is a predator and capable of consuming this bacterium
      if (!bacterium.isPredator || bacterium.size <= this.size) {
        continue;
      }

      const mesh = bacterium.getMesh();
      const canSee = this.isWithinSightRange(mesh, this.sightRange);
      const canDetect = this.isWithinAwarenessRange(mesh, this.awarenessRange);

      if (canSee && canDetect) {
        return bacterium;
      }
    }

    return undefined;
  }

  private attemptEscape(predator: Bacterium): boolean {
    const predatorPosition = predator.getMesh().position;
    const bacteriumPosition = this.mesh.position;

    if (this.hasSameLocation(predator.getMesh())) {
      return false;
    }

    const xDirectionToPredator = predatorPosition.x - bacteriumPosition.x;
    const yDirectionToPredator = predatorPosition.y - bacteriumPosition.y;

    const escapeVector = new THREE.Vector2(
      -xDirectionToPredator,
      -yDirectionToPredator
    ).normalize();

    let newXPosition = this.mesh.position.x + escapeVector.x * this.speed;
    let newYPosition = this.mesh.position.y + escapeVector.y * this.speed;

    if (newXPosition > 5 || newXPosition < -5) {
      escapeVector.x = -escapeVector.x;
    }
    if (newYPosition > 5 || newYPosition < -5) {
      escapeVector.y = -escapeVector.y;
    }

    this.mesh.position.x = newXPosition;
    this.mesh.position.y = newYPosition;

    this.rotateToFace(escapeVector);

    return true;
  }

  private moveInRandomDirection() {
    this.facingDirection = new THREE.Vector2(
      this.facingDirection.x + this.randomUnit() / 10,
      this.facingDirection.y + this.randomUnit() / 10
    ).normalize();

    let newXPosition =
      this.mesh.position.x + this.facingDirection.x * this.speed;
    let newYPosition =
      this.mesh.position.y + this.facingDirection.y * this.speed;

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
      const canSee = this.isWithinSightRange(mesh, this.sightRange);
      const canDetect = this.isWithinAwarenessRange(mesh, this.awarenessRange);

      if (canSee && canDetect) {
        return foodItem;
      }
    }

    return undefined;
  }

  private lookForPrey(bacteria: Bacterium[]): Bacterium | undefined {
    for (const bacterium of bacteria) {
      if (bacterium.size >= this.size) {
        continue; // Only prey on smaller bacteria
      }

      const mesh = bacterium.getMesh();
      const canSee = this.isWithinSightRange(mesh, this.sightRange);
      const canDetect = this.isWithinAwarenessRange(mesh, this.awarenessRange);

      if (canSee && canDetect) {
        return bacterium;
      }
    }

    return undefined;
  }

  private attemptToEatFood(food: Food): boolean {
    const foodPosition = food.getMesh().position;
    const bacteriumPosition = this.mesh.position;

    if (this.hasSameLocation(food.getMesh())) {
      return true;
    }

    let xDistanceToFood = Math.abs(foodPosition.x - bacteriumPosition.x);
    let yDistanceToFood = Math.abs(foodPosition.y - bacteriumPosition.y);

    let xRange = bacteriumPosition.x * this.speed;
    let yRange = bacteriumPosition.y * this.speed;

    const directionToFood = new THREE.Vector2(
      xDistanceToFood,
      yDistanceToFood
    ).normalize();

    this.rotateToFace(directionToFood);

    if (xRange <= xDistanceToFood && yRange <= yDistanceToFood) {
      this.mesh.position.x = foodPosition.x;
      this.mesh.position.y = foodPosition.y;
      return true;
    }

    this.mesh.position.x += directionToFood.x * this.speed;
    this.mesh.position.y += directionToFood.y * this.speed;

    return false;
  }

  private attemptToCatchPrey(prey: Bacterium): boolean {
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
    const tolerance = 0.05;
    return Math.abs(xDiff) < tolerance && Math.abs(yDiff) < tolerance;
  }

  private rotateToFace(direction: THREE.Vector2) {
    let angle = Math.atan2(direction.y, direction.x);

    this.mesh.rotation.z = angle;
  }
}
