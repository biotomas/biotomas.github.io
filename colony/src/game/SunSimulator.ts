import * as THREE from 'three';

export class SunSimulator {
    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private dayDuration: number = 60000; // 60 seconds for 24h
    private startTime: number;

    constructor(scene: THREE.Scene) {
        // Setup Directional Light for Sun with Shadows
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.castShadow = true;
        
        // Configure Shadow Camera
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.bias = -0.0005;

        scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(this.ambientLight);

        this.startTime = Date.now();
    }

    public update() {
        const elapsed = (Date.now() - this.startTime) % this.dayDuration;
        const progress = elapsed / this.dayDuration; // 0 to 1

        // 24h Clock Simulation
        // 0.0 (midnight) -> 0.5 (noon) -> 1.0 (midnight)
        // We want sunrise at 7:00 (7/24 = 0.29) and sunset at 19:00 (19/24 = 0.79)
        // Standard circle: angle = 0 is dawn, angle = PI is dusk
        // Shift progress so 0.0 is midnight. 
        // 0.5 progress should be Noon (Sun at top).
        
        const angle = (progress * Math.PI * 2) - Math.PI / 2;

        const radius = 100;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius; 

        this.sunLight.position.set(x, y, 0);
        
        // Intensity: Day is when Y > 0
        // We can tune the "Daylight" period by adjusting the angle mapping
        // But for simplicity, we use the sin(angle)
        this.sunLight.intensity = Math.max(0, Math.sin(angle)) * 1.5;
        this.ambientLight.intensity = 0.1 + Math.max(0, Math.sin(angle)) * 0.3;
    }

    public getSunIntensity(): number {
        const elapsed = (Date.now() - this.startTime) % this.dayDuration;
        const progress = elapsed / this.dayDuration;
        const angle = (progress * Math.PI * 2) - Math.PI / 2;
        return Math.max(0, Math.sin(angle));
    }

    public getFormattedTime(): string {
        const elapsed = (Date.now() - this.startTime) % this.dayDuration;
        const dayProgress = elapsed / this.dayDuration;
        const totalMinutes = dayProgress * 24 * 60;
        
        const hours = Math.floor(totalMinutes);
        const mins = Math.floor((totalMinutes % 1) * 60);
        
        const hStr = Math.floor(hours % 24).toString().padStart(2, '0');
        const mStr = mins.toString().padStart(2, '0');
        
        return `${hStr}:${mStr}`;
    }
}
