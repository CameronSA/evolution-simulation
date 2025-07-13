import * as THREE from 'three';
import { Food } from './food';

enum MutationType {
  size, // Larger bacteria can consume smaller bacteria
  speed, // Faster bacteria can escape predators and/or catch prey
  sight, // Bacteria with better sight can see further
  awareness, // Bacteria with better awareness can detect threats or food more easily
}

enum ActionResult {
  None,
  Reproduce,
  Die,
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
    this.sightRange = 1.0;
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
    // Implement behavior based on intelligence and speed
    // For example, move towards food or away from predators
    if (this.energy <= 0) {
      console.log(`Bacterium ${this.id} has died due to lack of energy.`);
      return ActionResult.Die;
    }

    if (this.energy > 10) {
      return ActionResult.Reproduce;
    }

    console.log('escape predation');
    const filteredBacteria = bacteria.filter((b) => b.id !== this.id);
    const predator = this.lookForPredators(filteredBacteria);
    if (predator) {
      if (this.attemptEscape(predator)) {
        this.energy -= 1; // Escaping costs energy
        return ActionResult.None;
      } else {
        return ActionResult.Die; // Caught by predator
      }
    }

    if (this.isPredator) {
      console.log('predation');
      const prey = this.lookForPrey(filteredBacteria);
      if (prey) {
        if (this.attemptToCatchPrey(prey)) {
          this.energy += 1; // Consuming prey gives energy
          return ActionResult.None;
        } else {
          this.energy -= 1; // Attempting to catch prey costs energy
          return ActionResult.None;
        }
      }
    } else {
      console.log('foraging');
      const foodItem = this.lookForFood(food);
      if (foodItem) {
        if (this.attemptToEatFood(foodItem)) {
          this.energy += 1; // Consuming food gives energy
          return ActionResult.None;
        } else {
          this.energy -= 1; // Attempting to eat food costs energy
          return ActionResult.None;
        }
      }
    }

    // If no actions were taken, move in a random direction
    this.moveInRandomDirection();
    this.energy -= 1;

    return ActionResult.None;
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

  private randomUnit() {
    return Math.random() * 2 - 1;
  }

  private lookForPredators(bacteria: Bacterium[]): Bacterium | undefined {
    for (const bacterium of bacteria) {
      if (!bacterium.isPredator) {
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
    return undefined;
  }

  private lookForPrey(bacteria: Bacterium[]): Bacterium | undefined {
    return undefined;
  }

  private attemptToEatFood(food: Food): boolean {
    return false;
  }

  private attemptToCatchPrey(prey: Bacterium): boolean {
    return false;
  }

  private isWithinSightRange(item: THREE.Mesh, range: number): boolean {
    return false;
  }

  private isWithinAwarenessRange(item: THREE.Mesh, range: number): boolean {
    return false;
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
