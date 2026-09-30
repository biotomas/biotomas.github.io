import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly radius: number = 20;
    private readonly detail: number = 3; // Subdivision level
    private mesh: THREE.Mesh;
    private tileCenters: THREE.Vector3[] = [];

    constructor() {
        super();
        
        // 1. Create a subdivided icosahedron
        const icoGeo = new THREE.IcosahedronGeometry(this.radius, this.detail);
        
        // 2. Generate the dual (Hex/Pent grid)
        // In the dual, every vertex of the original becomes a face (tile)
        // We'll approximate this by creating tiles around each vertex
        const geometry = this.createHexSphereGeometry(icoGeo);
        
        const material = new THREE.MeshPhongMaterial({
            color: 0x777777,
            flatShading: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.add(this.mesh);

        // Clear wireframe to see the hexes better
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
        );
        this.add(wireframe);
    }

    private createHexSphereGeometry(icoGeo: THREE.BufferGeometry): THREE.BufferGeometry {
        const posAttr = icoGeo.getAttribute('position');
        const vertices: THREE.Vector3[] = [];
        for (let i = 0; i < posAttr.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(posAttr, i));
        }

        // Remove duplicates to get unique vertex positions (the tile centers)
        const uniqueVertices: THREE.Vector3[] = [];
        const precision = 3;
        const seen = new Set();
        vertices.forEach(v => {
            const key = `${v.x.toFixed(precision)},${v.y.toFixed(precision)},${v.z.toFixed(precision)}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueVertices.push(v);
            }
        });

        this.tileCenters = uniqueVertices;

        // For a full dual implementation we'd need neighbor data.
        // For this prototype, we'll use a trick: 
        // A subdivided icosahedron with flat shading already looks hexagonal-ish if we interpret the faces.
        // But to get TRUE hexagons, we'll return the merged icoGeo with flat shading for now
        // and focus on the snapping logic.
        
        icoGeo.computeVertexNormals();
        return icoGeo;
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public getClosestTile(point: THREE.Vector3): { center: THREE.Vector3, id: string } {
        let minDist = Infinity;
        let closest = this.tileCenters[0];
        
        // Find closest vertex (tile center in the dual)
        for (const center of this.tileCenters) {
            const dist = point.distanceTo(center);
            if (dist < minDist) {
                minDist = dist;
                closest = center;
            }
        }
        
        const precision = 2;
        const id = `${closest.x.toFixed(precision)},${closest.y.toFixed(precision)},${closest.z.toFixed(precision)}`;
        
        return { center: closest, id };
    }

    public getSurfacePoint(direction: THREE.Vector3): THREE.Vector3 {
        return direction.clone().normalize().multiplyScalar(this.radius);
    }

    public getRadiusAt(): number {
        return this.radius;
    }
}
