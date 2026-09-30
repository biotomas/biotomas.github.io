import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class Terrain extends THREE.Group {
    private readonly radius: number = 20;
    private readonly resolution: number = 32;
    private mesh: THREE.Mesh;

    constructor() {
        super();
        
        const geometries: THREE.BufferGeometry[] = [];
        
        const faceNormals = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        faceNormals.forEach(normal => {
            geometries.push(this.createFaceGeometry(normal));
        });

        let mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        // Weld shared vertices at cube edges to fix seams
        mergedGeometry = BufferGeometryUtils.mergeVertices(mergedGeometry);
        mergedGeometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: 0x777777,
            flatShading: true,
        });

        this.mesh = new THREE.Mesh(mergedGeometry, material);
        this.mesh.receiveShadow = true;
        this.add(this.mesh);

        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(mergedGeometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
        );
        this.add(wireframe);
    }

    /**
     * Deterministic pseudo-noise for height displacement.
     * Ensures shared vertices have the same height.
     */
    private getHeight(v: THREE.Vector3): number {
        // Simple harmonic noise for deterministic planet-like features
        const freq = 1.5;
        const h = (
            Math.sin(v.x * freq) * Math.sin(v.y * freq) +
            Math.sin(v.y * freq * 2.1) * Math.sin(v.z * freq * 1.9) +
            Math.sin(v.z * freq * 3.3) * Math.sin(v.x * freq * 2.7)
        ) * 0.3;
        
        // RCT-style discrete steps (0.1 units)
        return Math.floor(h * 5) * 0.1;
    }

    private createFaceGeometry(localUp: THREE.Vector3): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const indices: number[] = [];

        const axisA = new THREE.Vector3(localUp.y, localUp.z, localUp.x);
        const axisB = new THREE.Vector3().crossVectors(localUp, axisA);

        for (let y = 0; y <= this.resolution; y++) {
            for (let x = 0; x <= this.resolution; x++) {
                const i = x + y * (this.resolution + 1);
                const percent = new THREE.Vector2(x / this.resolution, y / this.resolution);
                
                // 1. Map to Cube Surface
                const pointOnUnitCube = localUp.clone()
                    .add(axisA.clone().multiplyScalar((percent.x - 0.5) * 2))
                    .add(axisB.clone().multiplyScalar((percent.y - 0.5) * 2));

                // 2. Project to Sphere (using uniform mapping to reduce corner distortion)
                const p = pointOnUnitCube;
                const p2 = new THREE.Vector3(p.x * p.x, p.y * p.y, p.z * p.z);
                const sx = p.x * Math.sqrt(1 - p2.y / 2 - p2.z / 2 + (p2.y * p2.z) / 3);
                const sy = p.y * Math.sqrt(1 - p2.z / 2 - p2.x / 2 + (p2.z * p2.x) / 3);
                const sz = p.z * Math.sqrt(1 - p2.x / 2 - p2.y / 2 + (p2.x * p2.y) / 3);
                const pointOnUnitSphere = new THREE.Vector3(sx, sy, sz);
                
                // 3. Apply Displacement
                const h = this.getHeight(pointOnUnitSphere);
                const finalPos = pointOnUnitSphere.multiplyScalar(this.radius + h);
                
                vertices.push(finalPos.x, finalPos.y, finalPos.z);

                if (x < this.resolution && y < this.resolution) {
                    indices.push(i, i + this.resolution + 1, i + 1);
                    indices.push(i + 1, i + this.resolution + 1, i + this.resolution + 2);
                }
            }
        }

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return geometry;
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public getSurfacePoint(direction: THREE.Vector3): THREE.Vector3 {
        const normalized = direction.clone().normalize();
        const h = this.getHeight(normalized);
        return normalized.multiplyScalar(this.radius + h);
    }

    public getRadiusAt(direction: THREE.Vector3): number {
        const normalized = direction.clone().normalize();
        return this.radius + this.getHeight(normalized);
    }
}
