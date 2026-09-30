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
        
        // Sky Color Transition
        // Noon: 0x88ccff (Sky Blue)
        // Sunset/Sunrise: 0xffa500 (Orange) -> 0x442266 (Purple)
        // Night: 0x000005 (Deep Black/Blue)

        let skyColor: THREE.Color;
        if (intensity > 0.5) {
            // High Day: Interpolate between Light Blue and Cyan
            skyColor = new THREE.Color(0x4488ff).lerp(new THREE.Color(0x88ccff), (intensity - 0.5) * 2);
        } else if (intensity > 0) {
            // Sunrise/Sunset: Interpolate between Purple/Orange and Blue
            skyColor = new THREE.Color(0xff6600).lerp(new THREE.Color(0x4488ff), intensity * 2);
        } else {
            // Night
            skyColor = new THREE.Color(0x020205);
        }
        
        (this.skySphere.material as THREE.MeshBasicMaterial).color.copy(skyColor);

        // Stars visibility: Inverse of sun intensity
        // We only show stars when intensity is low
        const starOpacity = Math.max(0, 1.0 - intensity * 2.0);
        this.starMaterial.opacity = starOpacity;
        this.stars.visible = starOpacity > 0;
    }
}
