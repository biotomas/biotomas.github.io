import * as THREE from 'three';

export class SunSimulator {
    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private dayDuration: number = 60000; // 60 seconds in ms
    private startTime: number;

    constructor(scene: THREE.Scene) {
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(0, 50, 0);
        scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(this.ambientLight);

        this.startTime = Date.now();
    }

    public update() {
        const elapsed = (Date.now() - this.startTime) % this.dayDuration;
        const progress = elapsed / this.dayDuration; // 0 to 1

        // Angle in radians (0 to 2PI)
        // At 0: Dawn, 0.25: Noon, 0.5: Dusk, 0.75: Midnight
        const angle = progress * Math.PI * 2;

        // Position sun in a circle around the map
        const radius = 100;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius; // y is height

        this.sunLight.position.set(x, y, 0);
        
        // Intensity based on height (night is 0)
        this.sunLight.intensity = Math.max(0, Math.sin(angle)) * 1.5;
        this.ambientLight.intensity = 0.1 + Math.max(0, Math.sin(angle)) * 0.3;
    }

    /**
     * Returns sun efficiency from 0 to 1 based on its position in the sky.
     */
    public getSunIntensity(): number {
        const elapsed = (Date.now() - this.startTime) % this.dayDuration;
        const progress = elapsed / this.dayDuration;
        const angle = progress * Math.PI * 2;
        return Math.max(0, Math.sin(angle));
    }

    public getIsDay(): boolean {
        return this.getSunIntensity() > 0;
    }
}
