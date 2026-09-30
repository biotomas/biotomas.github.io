import * as THREE from 'three';

export class SunSimulator {
    private sunLight: THREE.DirectionalLight;
    private pointLight: THREE.PointLight;
    private ambientLight: THREE.AmbientLight;
    private sunGroup: THREE.Group;
    private dayDuration: number = 60000;
    private startTime: number;

    // Sun is fixed in space. Let's place it far away on the X axis.
    private readonly sunPosition = new THREE.Vector3(150, 0, 0);

    constructor(scene: THREE.Scene) {
        this.sunGroup = new THREE.Group();
        scene.add(this.sunGroup);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.castShadow = true;
        
        // Target origin (the planet center)
        this.sunLight.target.position.set(0, 0, 0);
        scene.add(this.sunLight.target);

        // Visual Sun
        const sunGeo = new THREE.SphereGeometry(6, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.sunGroup.add(sunMesh);

        // Glow effect
        const glowGeo = new THREE.SphereGeometry(12, 32, 32);
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
        this.pointLight = new THREE.PointLight(0xffaa66, 1.5, 500);
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

        // Position fixed sun
        this.sunLight.position.copy(this.sunPosition);
        this.sunGroup.position.copy(this.sunPosition);

        scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(this.ambientLight);

        this.startTime = Date.now();
    }

    public getDayProgress(): number {
        return ((Date.now() - this.startTime) % this.dayDuration) / this.dayDuration;
    }

    public update() {
        // Sun is fixed in this simulation.
        // We only update intensities if we want them to flicker or pulse, 
        // but static is more realistic for the fixed reference frame.
    }

    public getSunIntensityAt(worldPosition: THREE.Vector3): number {
        // Vector from planet center to position
        const toPos = worldPosition.clone().normalize();
        // Vector from planet center to sun
        const toSun = this.sunPosition.clone().normalize();
        // Dot product gives us the "sunniness" (1 at noon, 0 at dawn/dusk, -1 at midnight)
        return Math.max(0, toPos.dot(toSun));
    }

    public getFormattedTime(planetRotationY: number): string {
        // Time depends on rotation relative to the sun.
        // If rotation 0 is "Noon" facing the sun (150, 0, 0),
        // then time 12:00 is at rotation 0.
        // Rotation goes 0 to 2PI.
        
        // Normalize rotation to 0..1 range
        let progress = (planetRotationY % (Math.PI * 2)) / (Math.PI * 2);
        if (progress < 0) progress += 1.0;
        
        // Offset so that 12:00 is facing the sun
        // Depending on coordinate system, we might need an offset.
        // If Sun is at +X, and planet rotates CCW, then face +X is Noon.
        const totalMinutes = progress * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}
