import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    
    private phi: number = 0; // Azimuthal angle (around Y)
    private theta: number = Math.PI / 4; // Polar angle (from Y)
    private distance: number = 50;

    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    private keys: Set<string> = new Set();

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;

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
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        if (e.buttons === 1) { // Left click: Move
            this.phi -= deltaX * 0.005;
            this.theta = Math.max(0.1, Math.min(Math.PI - 0.1, this.theta + deltaY * 0.005));
        } else if (e.buttons === 2) { // Right click: Rotate (unused in spherical simple)
        }

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateCameraPosition();
    }

    private onMouseUp() {
        this.isDragging = false;
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault();
        this.distance = Math.max(25, Math.min(100, this.distance + e.deltaY * 0.05));
        this.updateCameraPosition();
    }

    private updateCameraPosition() {
        const x = this.distance * Math.sin(this.theta) * Math.sin(this.phi);
        const y = this.distance * Math.cos(this.theta);
        const z = this.distance * Math.sin(this.theta) * Math.cos(this.phi);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    public update() {
        const speed = 0.02;
        if (this.keys.has('KeyW')) this.theta -= speed;
        if (this.keys.has('KeyS')) this.theta += speed;
        if (this.keys.has('KeyA')) this.phi -= speed;
        if (this.keys.has('KeyD')) this.phi += speed;

        this.theta = Math.max(0.1, Math.min(Math.PI - 0.1, this.theta));
        this.updateCameraPosition();
    }

    public initKeyboard() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    }
}
