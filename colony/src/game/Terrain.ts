import * as THREE from 'three';

export class Terrain extends THREE.Group {
    private readonly tileSize: number = 1; // 1 unit in Three.js world space
    private readonly gridWidth: number;
    private readonly gridHeight: number;
    private heights: number[][];

    constructor(width: number, height: number) {
        super();
        this.gridWidth = width;
        this.gridHeight = height;
        this.heights = Array.from({ length: width }, () => new Array(height).fill(0));

        this.generateTerrain();
        this.createMesh();
    }

    private generateTerrain() {
        const maxHeightDiff = 0.2; // Equivalent to 10px / 50px ratio if 1 unit = 50px

        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                let minNeighborHeight = -Infinity;
                let maxNeighborHeight = Infinity;

                if (x > 0) {
                    minNeighborHeight = Math.max(minNeighborHeight, this.heights[x - 1][y] - maxHeightDiff);
                    maxNeighborHeight = Math.min(maxNeighborHeight, this.heights[x - 1][y] + maxHeightDiff);
                }
                if (y > 0) {
                    minNeighborHeight = Math.max(minNeighborHeight, this.heights[x][y - 1] - maxHeightDiff);
                    maxNeighborHeight = Math.min(maxNeighborHeight, this.heights[x][y - 1] + maxHeightDiff);
                }

                if (minNeighborHeight === -Infinity) {
                    this.heights[x][y] = (Math.random() - 0.5) * 0.5;
                } else {
                    this.heights[x][y] = minNeighborHeight + Math.random() * (maxNeighborHeight - minNeighborHeight);
                }
            }
        }
    }

    private createMesh() {
        // We'll use a single PlaneGeometry and manipulate its vertices for efficiency
        const geometry = new THREE.PlaneGeometry(
            this.gridWidth * this.tileSize,
            this.gridHeight * this.tileSize,
            this.gridWidth - 1,
            this.gridHeight - 1
        );

        geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

        const vertices = geometry.attributes.position.array;
        for (let x = 0; x < this.gridWidth; x++) {
            for (let z = 0; z < this.gridHeight; z++) {
                // PlaneGeometry vertices are ordered by row then column
                const index = (z * this.gridWidth + x) * 3;
                vertices[index + 1] = this.heights[x][z];
            }
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: 0x556633,
            flatShading: true,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        this.add(mesh);
        
        // Add a wireframe for better visibility of tiles
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.2 })
        );
        this.add(wireframe);
    }
}
