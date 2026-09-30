import * as THREE from 'three';
import { SunSimulator } from './SunSimulator';

export class Skybox extends THREE.Group {
    private sunSimulator: SunSimulator;
    private skySphere: THREE.Mesh;
    private stars: THREE.Points;
    private starMaterial: THREE.PointsMaterial;

    constructor(sunSimulator: SunSimulator) {
        super();
        this.sunSimulator = sunSimulator;

        // 1. Sky Sphere
        const skyGeo = new THREE.SphereGeometry(400, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            vertexColors: false
        });
        this.skySphere = new THREE.Mesh(skyGeo, skyMat);
        this.add(this.skySphere);

        // 2. Star Field
        const starGeo = new THREE.BufferGeometry();
        const starCount = 2000;
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const r = 350;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = r * Math.cos(phi);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        
        this.starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0
        });
        this.stars = new THREE.Points(starGeo, this.starMaterial);
        this.add(this.stars);
    }

    public update() {
        const intensity = this.sunSimulator.getSunIntensity();
        
        // Smoother Sky Color Transition
        // For an asteroid (no atmosphere), the sky should mostly stay dark, 
        // but we'll add a subtle color shift when facing the sun.
        
        const nightColor = new THREE.Color(0x010103);
        const sunsetColor = new THREE.Color(0x221133); // Dark purple twilight
        const dayColor = new THREE.Color(0x050510);    // Deep space blue even in day
        
        let skyColor: THREE.Color;
        
        if (intensity > 0.1) {
            // Facing the sun - subtle blue glow
            skyColor = sunsetColor.clone().lerp(dayColor, (intensity - 0.1) * 1.11);
        } else if (intensity > 0) {
            // Transition from night to twilight
            skyColor = nightColor.clone().lerp(sunsetColor, intensity * 10);
        } else {
            // Night
            skyColor = nightColor;
        }
        
        (this.skySphere.material as THREE.MeshBasicMaterial).color.copy(skyColor);

        // Stars visibility: Fade out only when sun is quite bright
        // On an asteroid, stars are visible even during the day if not looking at the sun,
        // but for game clarity we'll fade them slightly.
        const starOpacity = Math.max(0.2, 1.0 - intensity * 0.8);
        this.starMaterial.opacity = starOpacity;
        this.stars.visible = true;
    }
}
