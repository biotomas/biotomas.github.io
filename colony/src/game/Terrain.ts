import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class Terrain extends THREE.Group {
    private readonly radius: number = 20;
    private readonly resolution: number = 32; // Divisions per cube face
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

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
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

    private createFaceGeometry(localUp: THREE.Vector3): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const indices: number[] = [];

        const axisA = new THREE.Vector3(localUp.y, localUp.z, localUp.x);
        const axisB = new THREE.Vector3().crossVectors(localUp, axisA);

        const step = 0.1;

        for (let y = 0; y <= this.resolution; y++) {
            for (let x = 0; x <= this.resolution; x++) {
                const i = x + y * (this.resolution + 1);
                const percent = new THREE.Vector2(x / this.resolution, y / this.resolution);
                
                const pointOnUnitCube = localUp.clone()
                    .add(axisA.clone().multiplyScalar((percent.x - 0.5) * 2))
                    .add(axisB.clone().multiplyScalar((percent.y - 0.5) * 2));

                const pointOnUnitSphere = pointOnUnitCube.normalize();
                
                // Keep random displacement but subtle
                const h = (Math.floor(Math.random() * 3) * step);
                
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
        return direction.clone().normalize().multiplyScalar(this.radius + 0.2);
    }

    public getRadiusAt(): number {
        return this.radius + 0.2;
    }
}
