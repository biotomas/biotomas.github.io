import * as THREE from 'three';
import { Terrain } from './Terrain';
import { CameraController } from './CameraController';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private terrain: Terrain;
    private cameraController: CameraController;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x223344);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Terrain
        this.terrain = new Terrain(50, 50);
        this.scene.add(this.terrain);

        // Camera Controller
        this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        this.cameraController.initKeyboard();

        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public start() {
        this.animate();
    }

    private animate() {
        requestAnimationFrame(() => this.animate());

        this.cameraController.update();
        this.renderer.render(this.scene, this.camera);
    }
}
