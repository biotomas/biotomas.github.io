import * as THREE from 'three';

export class TileHighlight extends THREE.Group {
    private line: THREE.LineLoop;

    constructor() {
        super();
        
        const size = 1.0;
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(size, 0, 0),
            new THREE.Vector3(size, 0, size),
            new THREE.Vector3(0, 0, size),
        ]);

        const material = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        this.line = new THREE.LineLoop(geometry, material);
        // Slightly offset Y to prevent z-fighting with terrain
        this.line.position.y = 0.01;
        this.add(this.line);
    }

    public updatePosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
    }

    public setVisible(visible: boolean) {
        this.visible = visible;
    }
}
