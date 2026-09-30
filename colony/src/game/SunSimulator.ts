import * as THREE from 'three';

export class SunSimulator {
    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private dayDuration: number = 60000; // 60 seconds for 24h
    private startTime: number;

    // Rise at 5:00 (5/24 = 0.208), Set at 22:00 (22/24 = 0.916)
    // We achieve this by remapping the day progress to an angle that spends more time "above" the horizon.
    private readonly sunriseProgress = 5 / 24;
    private readonly sunsetProgress = 22 / 24;

    constructor(scene: THREE.Scene) {
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.castShadow = true;
        
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

    /**
     * Maps the 0-1 day progress to a sun angle.
     * We want angle 0 at sunriseProgress and angle PI at sunsetProgress.
     */
    private getSunAngle(): number {
        const progress = this.getDayProgress();
        
        // Linear interpolation for simpler day/night arc
        // If we want it to be "night" outside 5-22, we need a custom mapping.
        // A simple way is to shift and scale the progress for the "day" part.
        const dayLength = this.sunsetProgress - this.sunriseProgress;
        
        if (progress >= this.sunriseProgress && progress <= this.sunsetProgress) {
            // It's day. Map sunrise...sunset to 0...PI
            const dayProgress = (progress - this.sunriseProgress) / dayLength;
            return dayProgress * Math.PI;
        } else {
            // It's night. Map sunset...sunrise to PI...2PI
            const nightLength = 1.0 - dayLength;
            const nightProgress = progress < this.sunriseProgress 
                ? (progress + (1.0 - this.sunsetProgress)) / nightLength
                : (progress - this.sunsetProgress) / nightLength;
            return Math.PI + nightProgress * Math.PI;
        }
    }

    public update() {
        const angle = this.getSunAngle();

        const radius = 100;
        const x = Math.cos(angle + Math.PI); // Offset by PI so it rises from one side
        const y = Math.sin(angle); 

        this.sunLight.position.set(x, y * radius, 0);
        
        // Intensity: Max at noon, 0 during night
        this.sunLight.intensity = Math.max(0, Math.sin(angle)) * 1.5;
        this.ambientLight.intensity = 0.1 + Math.max(0, Math.sin(angle)) * 0.3;
    }

    public getSunIntensity(): number {
        const angle = this.getSunAngle();
        return Math.max(0, Math.sin(angle));
    }

    public getFormattedTime(): string {
        const progress = this.getDayProgress();
        const totalMinutes = progress * 24 * 60;
        
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}
