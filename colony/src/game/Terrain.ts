import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly radius: number = 20;
    private readonly detail: number = 5; // Much finer grid (3 -> 5)
    private mesh: THREE.Mesh;

    constructor() {
        super();
        
        // 1. Create a highly subdivided icosahedron
        // detail 5 gives a very smooth and fine grid
        const geometry = new THREE.IcosahedronGeometry(this.radius, this.detail);
        
        const material = new THREE.MeshPhongMaterial({
            color: 0x777777,
            flatShading: true, // Flat shading makes individual triangles visible
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.add(this.mesh);

        // Subdued wireframe for grid visibility
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.05 })
        );
        this.add(wireframe);
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    /**
     * Given an intersection from a raycaster, find the triangle's info.
     */
    public getFaceInfo(intersect: THREE.Intersection) {
        if (!intersect.face) return null;

        const geometry = this.mesh.geometry;
        const pos = geometry.attributes.position;
        
        // Vertices of the triangle
        const vA = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.a);
        const vB = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.b);
        const vC = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.c);

        // Center of the triangle (centroid)
        const center = new THREE.Vector3()
            .add(vA).add(vB).add(vC)
            .divideScalar(3);

        // Normal of the triangle
        const normal = intersect.face.normal.clone();

        // Unique ID for the face based on its vertices (sorted to ensure consistency)
        const indices = [intersect.face.a, intersect.face.b, intersect.face.c].sort((a, b) => a - b);
        const id = indices.join(',');

        return { center, normal, id, vA, vB, vC };
    }

    public getRadiusAt(): number {
        return this.radius;
    }
}
