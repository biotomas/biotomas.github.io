import * as THREE from 'three';

export class TileHighlight extends THREE.Group {
    constructor() {
        super();
        
        const size = 0.5; // Smaller for spherical tiles
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-size, 0, -size),
            new THREE.Vector3(size, 0, -size),
            new THREE.Vector3(size, 0, size),
            new THREE.Vector3(-size, 0, size),
        ]);

        const material = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        const line = new THREE.LineLoop(geometry, material);
        // Offset Y slightly to prevent z-fighting
        line.position.y = 0.05;
        this.add(line);
    }

    public updatePosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
    }

    public setVisible(visible: boolean) {
        this.visible = visible;
    }
}
