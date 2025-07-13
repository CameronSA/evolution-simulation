import * as THREE from 'three';
import { Food } from './food';

enum MutationType {
  size, // Larger bacteria can consume smaller bacteria
  speed, // Faster bacteria can escape predators and/or catch prey
  sight, // Bacteria with better sight can see further
  awareness, // Bacteria with better awareness can detect threats or food more easily
  predation, // Bacteria with predation can consume other bacteria
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
    speed: number,
    sightRange: number,
    awarenessRange: number,
    positionX: number,
    positionY: number
  ) {
    this.size = size;
    this.color = color;
    this.speed = speed;
    this.sightRange = sightRange;
    this.awarenessRange = awarenessRange;

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

    if (this.energy > 5000) {
      const newBacterium = new Bacterium(
        this.size,
        this.color,
        this.speed,
        this.sightRange,
        this.awarenessRange,
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

    const filteredBacteria = bacteria.filter((b) => b.id !== this.id);
    const predator = this.lookForPredators(filteredBacteria);
    if (predator) {
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
        if (this.attemptToEat(prey.getMesh(), 0.9)) {
          this.energy += 2000; // Consuming prey gives energy
          return { action: Action.None };
        } else {
          this.energy -= 1; // Attempting to catch prey costs energy
          return { action: Action.None };
        }
      }
    }

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
    this.moveInRandomDirection();
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

    switch (mutationType) {
      case MutationType.size:
        this.size += Math.random() / 2 - 0.25;
        break;
      case MutationType.speed:
        this.speed += Math.random() / 20 - 0.025;
        break;
      case MutationType.sight:
        this.sightRange += Math.random() / 2 - 0.25;
        break;
      case MutationType.awareness:
        this.awarenessRange += Math.random() / 2 - 0.25;
        break;
      case MutationType.predation:
        if (Math.random() >= 0.6) {
          this.isPredator = true;
        }
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

  private attemptToEat(food: THREE.Mesh, successChance: number): boolean {
    this.facingDirection = new THREE.Vector2(
      food.position.x - this.mesh.position.x,
      food.position.y - this.mesh.position.y
    ).normalize();

    this.rotateToFace(this.facingDirection);

    this.mesh.position.x = food.position.x;
    this.mesh.position.y = food.position.y;

    return Math.random() < successChance;
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
    const tolerance = 0.005;
    return Math.abs(xDiff) < tolerance && Math.abs(yDiff) < tolerance;
  }

  private rotateToFace(direction: THREE.Vector2) {
    let angle = Math.atan2(direction.y, direction.x);

    this.mesh.rotation.z = angle;
  }
}
