import { Injectable } from '@angular/core';
import { throttle } from 'lodash-es';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class ThreeRenderer {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  private cube: THREE.Mesh | null = null;
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
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    this.camera.position.z = 5;

    const animate = () => {
      this.cube!.rotation.x += 0.01;
      this.cube!.rotation.y += 0.01;
      this.renderer!.render(this.scene!, this.camera!);
    };

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
}
