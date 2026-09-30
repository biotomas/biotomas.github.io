import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly tileSize: number = 1;
    private readonly gridWidth: number;
    private readonly gridHeight: number;
    private heights: number[][]; // Heights at corners (W+1 x H+1)

    constructor(width: number, height: number) {
        super();
        this.gridWidth = width;
        this.gridHeight = height;
        this.heights = Array.from({ length: width + 1 }, () => new Array(height + 1).fill(0));

        this.generateTerrain();
        this.createMesh();
    }

    private generateTerrain() {
        const step = 0.1;
        const maxStepDiff = 2; // max 0.2 diff (2 * 0.1)

        for (let x = 0; x <= this.gridWidth; x++) {
            for (let z = 0; z <= this.gridHeight; z++) {
                let minH = -2.0; // Floor
                let maxH = 2.0;  // Ceiling

                if (x > 0) {
                    minH = Math.max(minH, this.heights[x - 1][z] - maxStepDiff * step);
                    maxH = Math.min(maxH, this.heights[x - 1][z] + maxStepDiff * step);
                }
                if (z > 0) {
                    minH = Math.max(minH, this.heights[x][z - 1] - maxStepDiff * step);
                    maxH = Math.min(maxH, this.heights[x][z - 1] + maxStepDiff * step);
                }

                // Randomly pick a height in steps of 0.1
                const possibleSteps = Math.floor((maxH - minH) / step);
                const randomStep = Math.floor(Math.random() * (possibleSteps + 1));
                this.heights[x][z] = parseFloat((minH + randomStep * step).toFixed(1));
            }
        }
    }

    private createMesh() {
        const geometry = new THREE.PlaneGeometry(
            this.gridWidth * this.tileSize,
            this.gridHeight * this.tileSize,
            this.gridWidth,
            this.gridHeight
        );

        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let z = 0; z <= this.gridHeight; z++) {
            for (let x = 0; x <= this.gridWidth; x++) {
                const vertexIndex = (z * (this.gridWidth + 1) + x) * 3;
                vertices[vertexIndex + 1] = this.heights[x][z];
            }
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: 0x558844,
            flatShading: true,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Offset to align 0,0 corner with world 0,0
        mesh.position.set(this.gridWidth / 2, 0, this.gridHeight / 2);
        this.add(mesh);
        
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
        );
        wireframe.position.copy(mesh.position);
        this.add(wireframe);
    }

    public getHeightAt(x: number, z: number): number {
        // Simple average for now, or sample the 4 corners
        const ix = Math.floor(x);
        const iz = Math.floor(z);
        if (ix < 0 || ix >= this.gridWidth || iz < 0 || iz >= this.gridHeight) return 0;
        
        // Return max height of the tile corners to ensure building is above ground
        return Math.max(
            this.heights[ix][iz],
            this.heights[ix+1][iz],
            this.heights[ix][iz+1],
            this.heights[ix+1][iz+1]
        );
    }
}
