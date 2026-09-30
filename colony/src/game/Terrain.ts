import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly tileSize: number = 1;
    private readonly gridWidth: number;
    private readonly gridHeight: number;
    private heights: number[][];
    private mesh: THREE.Mesh;

    constructor(width: number, height: number) {
        super();
        this.gridWidth = width;
        this.gridHeight = height;
        this.heights = Array.from({ length: width + 1 }, () => new Array(height + 1).fill(0));

        this.generateTerrain();
        
        const geometry = this.createGeometry();
        const material = new THREE.MeshPhongMaterial({
            color: 0x558844,
            flatShading: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.add(this.mesh);

        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
        );
        this.add(wireframe);
    }

    private generateTerrain() {
        const step = 0.1;
        const maxStepDiff = 2;

        for (let x = 0; x <= this.gridWidth; x++) {
            for (let z = 0; z <= this.gridHeight; z++) {
                let minH = -2.0;
                let maxH = 2.0;

                if (x > 0) {
                    minH = Math.max(minH, this.heights[x - 1][z] - maxStepDiff * step);
                    maxH = Math.min(maxH, this.heights[x - 1][z] + maxStepDiff * step);
                }
                if (z > 0) {
                    minH = Math.max(minH, this.heights[x][z - 1] - maxStepDiff * step);
                    maxH = Math.min(maxH, this.heights[x][z - 1] + maxStepDiff * step);
                }

                const possibleSteps = Math.floor((maxH - minH) / step);
                const randomStep = Math.floor(Math.random() * (possibleSteps + 1));
                this.heights[x][z] = parseFloat((minH + randomStep * step).toFixed(1));
            }
        }
    }

    private createGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const indices: number[] = [];

        // Create vertices
        for (let z = 0; z <= this.gridHeight; z++) {
            for (let x = 0; x <= this.gridWidth; x++) {
                vertices.push(x * this.tileSize, this.heights[x][z], z * this.tileSize);
            }
        }

        // Create indices (two triangles per tile)
        for (let z = 0; z < this.gridHeight; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const row1 = z * (this.gridWidth + 1);
                const row2 = (z + 1) * (this.gridWidth + 1);

                // Triangle 1
                indices.push(row1 + x, row2 + x, row1 + x + 1);
                // Triangle 2
                indices.push(row1 + x + 1, row2 + x, row2 + x + 1);
            }
        }

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        return geometry;
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public getHeightAt(x: number, z: number): number {
        const ix = Math.floor(x);
        const iz = Math.floor(z);
        if (ix < 0 || ix >= this.gridWidth || iz < 0 || iz >= this.gridHeight) return 0;
        
        return Math.max(
            this.heights[ix][iz],
            this.heights[ix+1][iz],
            this.heights[ix][iz+1],
            this.heights[ix+1][iz+1]
        );
    }
}
