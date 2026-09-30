import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly radius: number = 20;
    private readonly segments: number = 64;
    private mesh: THREE.Mesh;
    private heights: Float32Array;

    constructor() {
        super();
        
        // Sphere geometry
        const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments / 2);
        this.heights = new Float32Array(geometry.attributes.position.count);
        
        this.generateTerrain(geometry);
        
        const material = new THREE.MeshPhongMaterial({
            color: 0x777777,
            flatShading: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.add(this.mesh);

        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
        );
        this.add(wireframe);
    }

    private generateTerrain(geometry: THREE.BufferGeometry) {
        const positions = geometry.attributes.position.array;
        const step = 0.1;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            const vec = new THREE.Vector3(x, y, z).normalize();
            
            // Simple random height displacement with steps
            // In a real project we'd use Perlin noise here for continuity
            const h = (Math.floor(Math.random() * 5) * step);
            this.heights[i / 3] = h;

            positions[i] = vec.x * (this.radius + h);
            positions[i + 1] = vec.y * (this.radius + h);
            positions[i + 2] = vec.z * (this.radius + h);
        }
        
        geometry.computeVertexNormals();
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public getSurfacePoint(direction: THREE.Vector3): THREE.Vector3 {
        // Find the height at a given direction
        // For now, return base radius + average displacement since we don't have a grid map yet
        // In the next iteration, we should use a proper data structure for height lookups
        return direction.clone().normalize().multiplyScalar(this.radius + 0.2);
    }

    public getRadiusAt(): number {
        return this.radius + 0.2; // Simplified for now
    }
}
