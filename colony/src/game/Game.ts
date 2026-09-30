import * as THREE from 'three';
import { Terrain } from './Terrain';
import { CameraController } from './CameraController';
import { BuildingManager } from './BuildingManager';
import { SunSimulator } from './SunSimulator';
import { ResourceManager } from './ResourceManager';
import { UIManager } from '../UIManager';
import { Skybox } from './Skybox';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    
    private asteroidGroup: THREE.Group;
    private terrain: Terrain;
    private buildingManager: BuildingManager;

    private cameraController: CameraController;
    private sunSimulator: SunSimulator;
    private resourceManager: ResourceManager;
    private skybox: Skybox;
    private uiManager: UIManager;

    private rotationDuration: number = 60000; // 60s for 360 deg
    private startTime: number;

    constructor() {
        this.scene = new THREE.Scene();
        this.startTime = Date.now();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Sun & Sky (Fixed in Space)
        this.sunSimulator = new SunSimulator(this.scene);
        this.skybox = new Skybox();
        this.scene.add(this.skybox);

        // Asteroid Group (Rotating)
        this.asteroidGroup = new THREE.Group();
        this.scene.add(this.asteroidGroup);

        this.terrain = new Terrain();
        this.asteroidGroup.add(this.terrain);

        this.buildingManager = new BuildingManager(this.scene, this.camera, this.terrain);
        // We need to make sure buildings are added to the asteroidGroup so they rotate with it
        // We'll modify BuildingManager to use asteroidGroup instead of scene
        (this.buildingManager as any).placementGroup = this.asteroidGroup;

        // Resource Manager
        this.resourceManager = new ResourceManager(this.buildingManager, this.sunSimulator);

        // UI Manager
        this.uiManager = new UIManager(this.buildingManager);
        this.uiManager.setManagers(this.resourceManager, this.sunSimulator);

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

        // Rotate the Asteroid
        const elapsed = (Date.now() - this.startTime) % this.rotationDuration;
        const progress = elapsed / this.rotationDuration;
        const rotationY = progress * Math.PI * 2;
        this.asteroidGroup.rotation.y = rotationY;

        this.sunSimulator.update();
        this.skybox.update();
        this.resourceManager.update();
        this.cameraController.update();
        this.buildingManager.update();
        
        // Pass current rotation to UI for time formatting
        this.uiManager.update(rotationY);

        this.renderer.render(this.scene, this.camera);
    }
}
