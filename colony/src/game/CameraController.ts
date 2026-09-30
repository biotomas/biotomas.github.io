import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private parentGroup: THREE.Group;
    
    // Position on the surface (spherical coordinates)
    private lat: number = 0; // Latitude (-PI/2 to PI/2)
    private lon: number = 0; // Longitude (0 to 2PI)
    
    // Camera "pole" properties
    private distance: number = 40; // Total distance from planet center (zoom)
    private pitch: number = Math.PI / 6; // Rotation of camera from the look-at-center vector
    private yaw: number = 0; // Panning around the pole axis

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

        this.yaw -= deltaX * 0.005;
        this.pitch = Math.max(-0.5, Math.min(1.2, this.pitch + deltaY * 0.005));

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateCameraPosition();
    }

    private onMouseUp() {
        this.isRightDragging = false;
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault();
        // Standardize deltaY across browsers (some use 1, others 100)
        const delta = Math.sign(e.deltaY);
        const zoomSpeed = 2.0;
        this.distance = Math.max(22, Math.min(100, this.distance + delta * zoomSpeed));
        this.updateCameraPosition();
    }

    private updateCameraPosition() {
        // 1. Position the camera in local space
        // Using standard spherical coordinates for the pole position
        const x = this.distance * Math.cos(this.lat) * Math.sin(this.lon);
        const y = this.distance * Math.sin(this.lat);
        const z = this.distance * Math.cos(this.lat) * Math.cos(this.lon);

        this.camera.position.set(x, y, z);

        // 2. Aim at the planet center (0,0,0 in local space)
        // Since we are a child of parentGroup, we can just look at (0,0,0) local
        // but Three.js lookAt is tricky with parents.
        // A better way: look at origin, then apply offsets.
        const origin = new THREE.Vector3(0, 0, 0);
        this.camera.lookAt(origin);
        
        // 3. Apply relative rotation (panning/pitching from the pole)
        // This makes the user able to look around from the pole top
        this.camera.rotateX(this.pitch);
        this.camera.rotateY(this.yaw);
    }

    public update() {
        const speed = 0.02;
        let moved = false;

        if (this.keys.has('KeyW')) { this.lat += speed; moved = true; }
        if (this.keys.has('KeyS')) { this.lat -= speed; moved = true; }
        if (this.keys.has('KeyA')) { this.lon -= speed; moved = true; }
        if (this.keys.has('KeyD')) { this.lon += speed; moved = true; }

        if (moved) {
            // Clamp latitude to avoid flipping at poles
            this.lat = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.lat));
            this.updateCameraPosition();
        }
    }

    public initKeyboard() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    }
}
