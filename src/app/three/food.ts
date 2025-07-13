import * as THREE from 'three';

export class Food {
  id: string = crypto.randomUUID();
  private mesh: THREE.Mesh;

  constructor(positionX: number, positionY: number) {
    const geometry = new THREE.CircleGeometry(0.05, 32);
    const material = new THREE.MeshBasicMaterial({ color: 'blue' });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(positionX, positionY, 0);
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  delete() {
    this.mesh.geometry.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
