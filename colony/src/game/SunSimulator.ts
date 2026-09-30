import * as THREE from 'three';

export class SunSimulator {
    private sunLight: THREE.DirectionalLight;
    private pointLight: THREE.PointLight;
    private ambientLight: THREE.AmbientLight;
    private sunGroup: THREE.Group;
    private dayDuration: number = 60000;
    private startTime: number;

    private readonly sunriseProgress = 5 / 24;
    private readonly sunsetProgress = 22 / 24;

    constructor(scene: THREE.Scene) {
        this.sunGroup = new THREE.Group();
        scene.add(this.sunGroup);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.castShadow = true;
        
        // Target origin for the planet
        this.sunLight.target.position.set(0, 0, 0);
        scene.add(this.sunLight.target);

        // Visual Sun
        const sunGeo = new THREE.SphereGeometry(4, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.sunGroup.add(sunMesh);

        // Glow effect
        const glowGeo = new THREE.SphereGeometry(8, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffccaa,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            side: THREE.FrontSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        this.sunGroup.add(glowMesh);

        // Point light for close-up glow
        this.pointLight = new THREE.PointLight(0xffaa66, 1.0, 500);
        this.sunGroup.add(this.pointLight);

        // Configure Shadow Camera for Sphere
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -40;
        this.sunLight.shadow.camera.right = 40;
        this.sunLight.shadow.camera.top = 40;
        this.sunLight.shadow.camera.bottom = -40;
        this.sunLight.shadow.bias = -0.0005;

        scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(this.ambientLight);

        this.startTime = Date.now();
    }

    public getDayProgress(): number {
        return ((Date.now() - this.startTime) % this.dayDuration) / this.dayDuration;
    }

    private getSunAngle(): number {
        const progress = this.getDayProgress();
        const dayLength = this.sunsetProgress - this.sunriseProgress;
        
        if (progress >= this.sunriseProgress && progress <= this.sunsetProgress) {
            const dayProgress = (progress - this.sunriseProgress) / dayLength;
            return dayProgress * Math.PI;
        } else {
            const nightLength = 1.0 - dayLength;
            const nightProgress = progress < this.sunriseProgress 
                ? (progress + (1.0 - this.sunsetProgress)) / nightLength
                : (progress - this.sunsetProgress) / nightLength;
            return Math.PI + nightProgress * Math.PI;
        }
    }

    public update() {
        const angle = this.getSunAngle();
        const radius = 150; // Increased radius for planet scale

        const x = Math.cos(angle + Math.PI) * radius;
        const y = Math.sin(angle) * radius; 
        const z = 0;

        this.sunLight.position.set(x, y, z);
        this.sunGroup.position.set(x, y, z);
        
        const intensity = Math.max(0, Math.sin(angle));
        this.sunLight.intensity = intensity * 1.5;
        this.pointLight.intensity = intensity * 2.0;
        this.ambientLight.intensity = 0.05 + intensity * 0.2;
    }

    public getSunIntensity(): number {
        return Math.max(0, Math.sin(this.getSunAngle()));
    }

    public getFormattedTime(): string {
        const progress = this.getDayProgress();
        const totalMinutes = progress * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}
