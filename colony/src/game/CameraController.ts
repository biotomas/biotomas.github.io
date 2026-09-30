import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private parentGroup: THREE.Group;
    
    // Position on the surface (spherical coordinates)
    private lat: number = 0; // Latitude (phi)
    private lon: number = 0; // Longitude (theta)
    
    // Camera "pole" properties
    private distance: number = 30; // Height of the "pole" from planet center
    private pitch: number = Math.PI / 4; // Angle looking down
    private yaw: number = 0; // Rotation around the "pole"

    private isRightDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    private keys: Set<string> = new Set();

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, parentGroup: THREE.Group) {
        this.camera = camera;
        this.domElement = domElement;
        this.parentGroup = parentGroup;

        // Attach camera to the rotating group so it moves with the planet
        this.parentGroup.add(this.camera);

        this.updateCameraPosition();
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        this.domElement.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    private onMouseDown(e: MouseEvent) {
        if (e.button === 2) { // Right click
            this.isRightDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isRightDragging) return;

        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        // Pan/Rotate camera view from top of pole
        this.yaw -= deltaX * 0.005;
        this.pitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.pitch + deltaY * 0.005));

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateCameraPosition();
    }

    private onMouseUp() {
        this.isRightDragging = false;
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault();
        // Zoom in/out (adjust "pole" height)
        this.distance = Math.max(22, Math.min(60, this.distance + e.deltaY * 0.02));
        this.updateCameraPosition();
    }

    private updateCameraPosition() {
        // 1. Position the base of the "pole" in local asteroid space
        const x = this.distance * Math.cos(this.lat) * Math.sin(this.lon);
        const y = this.distance * Math.sin(this.lat);
        const z = this.distance * Math.cos(this.lat) * Math.cos(this.lon);

        this.camera.position.set(x, y, z);

        // 2. Orient camera to look at the surface point directly below it
        // and then apply the user's yaw/pitch offsets
        const targetX = 20 * Math.cos(this.lat) * Math.sin(this.lon);
        const targetY = 20 * Math.sin(this.lat);
        const targetZ = 20 * Math.cos(this.lat) * Math.cos(this.lon);
        const target = new THREE.Vector3(targetX, targetY, targetZ);
        
        this.camera.lookAt(target);
        
        // Apply relative rotation for panning
        this.camera.rotateX(this.pitch);
        this.camera.rotateY(this.yaw);
    }

    public update() {
        const speed = 0.01;
        if (this.keys.has('KeyW')) this.lat += speed;
        if (this.keys.has('KeyS')) this.lat -= speed;
        if (this.keys.has('KeyA')) this.lon -= speed;
        if (this.keys.has('KeyD')) this.lon += speed;

        // Clamp latitude to avoid flipping at poles
        this.lat = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.lat));

        if (this.keys.size > 0) {
            this.updateCameraPosition();
        }
    }

    public initKeyboard() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    }
}
