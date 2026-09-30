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

    private getDayProgress(): number {
        return ((Date.now() - this.startTime) % this.dayDuration) / this.dayDuration;
    }

    public update() {
        const progress = this.getDayProgress();

        // 24h Clock Simulation: 0.0 is midnight, 0.5 is noon.
        // We want Noon (0.5) to be at the top (Angle = PI/2).
        // Angle = (progress * 2PI) - PI/2.
        // progress 0.0 -> -PI/2 (Midnight, sun at bottom)
        // progress 0.25 -> 0 (6:00 AM, Sunrise)
        // progress 0.5 -> PI/2 (Noon, sun at top)
        // progress 0.75 -> PI (6:00 PM, Sunset)
        
        const angle = (progress * Math.PI * 2) - Math.PI / 2;

        const radius = 100;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius; 

        this.sunLight.position.set(x, y, 0);
        
        // Intensity: Max at noon, 0 during night (Y < 0)
        this.sunLight.intensity = Math.max(0, Math.sin(angle)) * 1.5;
        this.ambientLight.intensity = 0.1 + Math.max(0, Math.sin(angle)) * 0.3;
    }

    public getSunIntensity(): number {
        const progress = this.getDayProgress();
        const angle = (progress * Math.PI * 2) - Math.PI / 2;
        return Math.max(0, Math.sin(angle));
    }

    public getFormattedTime(): string {
        const progress = this.getDayProgress();
        const totalMinutes = progress * 24 * 60;
        
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        
        const hStr = hours.toString().padStart(2, '0');
        const mStr = mins.toString().padStart(2, '0');
        
        return `${hStr}:${mStr}`;
    }
}
