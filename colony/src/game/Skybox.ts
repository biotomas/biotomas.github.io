import * as THREE from 'three';

export class Skybox extends THREE.Group {
    private skySphere: THREE.Mesh;
    private stars: THREE.Points;
    private starMaterial: THREE.PointsMaterial;

    constructor() {
        super();

        // Skybox is fixed in space (0,0,0)
        this.position.set(0, 0, 0);

        // 1. Sky Sphere (Deep Space)
        const skyGeo = new THREE.SphereGeometry(400, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x010103,
            side: THREE.BackSide,
        });
        this.skySphere = new THREE.Mesh(skyGeo, skyMat);
        this.add(this.skySphere);

        // 2. Star Field (Fixed relative to the Sun)
        const starGeo = new THREE.BufferGeometry();
        const starCount = 3000;
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const r = 380;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = r * Math.cos(phi);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        
        this.starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.8,
            transparent: true,
            opacity: 0.8
        });
        this.stars = new THREE.Points(starGeo, this.starMaterial);
        this.add(this.stars);
    }

    public update() {
        // Skybox and stars are fixed in this realistic simulation.
        // No rotation here, as the asteroid rotates instead.
    }
}
