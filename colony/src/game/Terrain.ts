import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly radius: number = 20;
    private readonly detail: number = 5; 
    private mesh: THREE.Mesh;

    // Deterministic random craters
    private craters: { pos: THREE.Vector3, radius: number, depth: number }[] = [];

    constructor() {
        super();
        
        // Generate crater data
        this.generateCraters();

        const geometry = new THREE.IcosahedronGeometry(this.radius, this.detail);
        
        // Apply craters and colors
        this.applyProceduralDetail(geometry);

        const material = new THREE.MeshPhongMaterial({
            flatShading: true,
            vertexColors: true,
            map: this.createRockyTexture(), // Apply procedural texture
            shininess: 10,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.add(this.mesh);

        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.03 })
        );
        this.add(wireframe);
    }

    private createRockyTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // Fill with base gray
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, 512, 512);

        // Add fine noise (grain)
        for (let i = 0; i < 20000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const gray = Math.floor(Math.random() * 60) + 100;
            ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
            ctx.fillRect(x, y, 1, 1);
        }

        // Add some "dusty" artifacts
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 3 + 1;
            const gray = Math.floor(Math.random() * 40) + 140;
            ctx.fillStyle = `rgba(${gray},${gray},${gray}, 0.3)`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Tile the texture several times across the sphere for high detail
        texture.repeat.set(16, 8); 
        
        return texture;
    }

    private generateCraters() {
        const count = 40;
        for (let i = 0; i < count; i++) {
            const pos = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            
            this.craters.push({
                pos,
                radius: 1.0 + Math.random() * 4.0,
                depth: 0.3 + Math.random() * 0.7
            });
        }
    }

    private applyProceduralDetail(geometry: THREE.BufferGeometry) {
        const posAttr = geometry.attributes.position;
        const colors: number[] = [];
        
        const v = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
            v.fromBufferAttribute(posAttr, i);
            const dir = v.clone().normalize();
            
            // 1. Calculate Crater Displacement
            let displacement = 0;
            for (const crater of this.craters) {
                const dist = v.distanceTo(crater.pos.clone().multiplyScalar(this.radius));
                if (dist < crater.radius) {
                    // Simple crater profile: depression + rim
                    const x = dist / crater.radius; // 0 to 1
                    // Crater shape function (smoothstep-like)
                    // Deep in center, raised rim at edges
                    const craterShape = -Math.cos(x * Math.PI) * 0.5 + 0.5; // inverted bell
                    const rimShape = Math.sin(x * Math.PI) * 0.2;
                    
                    displacement -= craterShape * crater.depth;
                    displacement += rimShape * (crater.depth * 0.5);
                }
            }

            // 2. Add some high-frequency noise for "rocky" feel
            const noise = (Math.sin(v.x * 2) * Math.cos(v.y * 2) * Math.sin(v.z * 2)) * 0.1;
            displacement += noise;

            const finalRadius = this.radius + displacement;
            posAttr.setXYZ(i, dir.x * finalRadius, dir.y * finalRadius, dir.z * finalRadius);

            // 3. Vertex Colors (Dust/Rock)
            // Base gray
            const baseColor = new THREE.Color(0x777777);
            // Random dust patches
            const d = (Math.sin(v.x * 0.5) + Math.sin(v.y * 0.5) + Math.sin(v.z * 0.5)) / 3;
            if (d > 0.2) baseColor.lerp(new THREE.Color(0x999988), 0.3); // Lighter dust
            if (d < -0.2) baseColor.lerp(new THREE.Color(0x555555), 0.2); // Darker patches
            
            // Highlight crater rims or floors
            if (displacement < -0.2) baseColor.lerp(new THREE.Color(0x444444), 0.4);
            
            colors.push(baseColor.r, baseColor.g, baseColor.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public getFaceInfo(intersect: THREE.Intersection) {
        if (!intersect.face) return null;

        const geometry = this.mesh.geometry;
        const pos = geometry.attributes.position;
        
        const vA = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.a);
        const vB = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.b);
        const vC = new THREE.Vector3().fromBufferAttribute(pos, intersect.face.c);

        const center = new THREE.Vector3()
            .add(vA).add(vB).add(vC)
            .divideScalar(3);

        const indices = [intersect.face.a, intersect.face.b, intersect.face.c].sort((a, b) => a - b);
        const id = indices.join(',');

        // Return a slightly normalized surface normal for building alignment
        const normal = center.clone().normalize();

        return { center, normal, id, vA, vB, vC };
    }

    public getRadiusAt(): number {
        return this.radius;
    }
}
