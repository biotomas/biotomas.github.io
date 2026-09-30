import * as THREE from 'three';

export class TileHighlight extends THREE.Group {
    private line: THREE.LineLoop;

    constructor() {
        super();
        
        // We'll update the geometry dynamically based on the triangle vertices
        const geometry = new THREE.BufferGeometry();
        // Placeholder positions
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));

        const material = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            linewidth: 2,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Ensure it's visible over terrain
        });

        this.line = new THREE.LineLoop(geometry, material);
        this.add(this.line);
    }

    public updateTriangle(vA: THREE.Vector3, vB: THREE.Vector3, vC: THREE.Vector3) {
        const positions = new Float32Array([
            vA.x, vA.y, vA.z,
            vB.x, vB.y, vB.z,
            vC.x, vC.y, vC.z
        ]);
        
        this.line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.line.geometry.attributes.position.needsUpdate = true;
        
        // Offset slightly along the average normal to prevent z-fighting
        const normal = new THREE.Vector3().add(vA).add(vB).add(vC).normalize();
        this.position.copy(normal.multiplyScalar(0.05));
    }

    public setVisible(visible: boolean) {
        this.visible = visible;
    }
}
