import * as THREE from 'three';
import { Terrain } from './Terrain';
import { CameraController } from './CameraController';
import { BuildingManager } from './BuildingManager';
import { SunSimulator } from './SunSimulator';
import { ResourceManager } from './ResourceManager';
import { UIManager } from '../UIManager';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private terrain: Terrain;
    private cameraController: CameraController;
    private buildingManager: BuildingManager;
    private sunSimulator: SunSimulator;
    private resourceManager: ResourceManager;
    private uiManager: UIManager;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x223344);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Sun & Light Simulator
        this.sunSimulator = new SunSimulator(this.scene);

        // Terrain
        this.terrain = new Terrain(50, 50);
        this.scene.add(this.terrain);

        // Building Manager
        this.buildingManager = new BuildingManager(this.scene, this.camera, this.terrain);

        // Resource Manager
        this.resourceManager = new ResourceManager(this.buildingManager, this.sunSimulator);

        // UI Manager
        this.uiManager = new UIManager(this.buildingManager);
        this.uiManager.setResourceManager(this.resourceManager);

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

        this.sunSimulator.update();
        this.resourceManager.update();
        this.cameraController.update();
        this.buildingManager.update();
        this.uiManager.update();

        this.renderer.render(this.scene, this.camera);
    }
}
