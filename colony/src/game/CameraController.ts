import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    
    private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private distance: number = 20;
    private rotation: number = Math.PI / 4;
    private pitch: number = Math.PI / 4;

    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

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
        
        // Prevent context menu on right click to allow dragging
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    private onMouseDown(e: MouseEvent) {
        if (e.button === 0 || e.button === 2) { // Left or Right click
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        if (e.buttons === 1) { // Left click: Pan
            const panSpeed = 0.02 * (this.distance / 20);
            
            // Calculate pan direction relative to camera rotation
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            
            forward.y = 0;
            forward.normalize();
            
            this.target.add(right.multiplyScalar(-deltaX * panSpeed));
            this.target.add(forward.multiplyScalar(deltaY * panSpeed));
        } else if (e.buttons === 2) { // Right click: Rotate
            this.rotation -= deltaX * 0.005;
            this.pitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.pitch + deltaY * 0.005));
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
        const zoomSpeed = 0.1;
        this.distance = Math.max(5, Math.min(100, this.distance + e.deltaY * zoomSpeed * (this.distance / 50)));
        this.updateCameraPosition();
    }

    private updateCameraPosition() {
        const offset = new THREE.Vector3(
            this.distance * Math.sin(this.rotation) * Math.cos(this.pitch),
            this.distance * Math.sin(this.pitch),
            this.distance * Math.cos(this.rotation) * Math.cos(this.pitch)
        );

        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
    }

    public update() {
        // Reserved for smooth transitions or keyboard input
        if (this.isKeyPressed('KeyW')) this.moveTarget(0, 1);
        if (this.isKeyPressed('KeyS')) this.moveTarget(0, -1);
        if (this.isKeyPressed('KeyA')) this.moveTarget(-1, 0);
        if (this.isKeyPressed('KeyD')) this.moveTarget(1, 0);
        this.updateCameraPosition();
    }

    private keys: Set<string> = new Set();
    private isKeyPressed(code: string) {
        return this.keys.has(code);
    }

    private moveTarget(dx: number, dz: number) {
        const speed = 0.2 * (this.distance / 20);
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        
        forward.y = 0;
        forward.normalize();
        
        this.target.add(right.multiplyScalar(dx * speed));
        this.target.add(forward.multiplyScalar(dz * speed));
    }

    public initKeyboard() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    }
}
