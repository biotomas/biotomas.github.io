import * as THREE from 'three';
import { Building, BuildingType } from './Building';
import { Terrain } from './Terrain';

export class BuildingManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private terrain: Terrain;
    private buildings: Building[] = [];
    private occupiedTiles: Set<string> = new Set();
    
    private activeBuildingType: BuildingType | null = null;
    private previewBuilding: Building | null = null;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, terrain: Terrain) {
        this.scene = scene;
        this.camera = camera;
        this.terrain = terrain;

        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    }

    public setActiveBuildingType(type: BuildingType | null) {
        this.activeBuildingType = type;

        if (this.previewBuilding) {
            this.scene.remove(this.previewBuilding);
            this.previewBuilding = null;
        }

        if (type) {
            this.previewBuilding = new Building(type);
            this.setPreviewMaterial(this.previewBuilding, 0x00ff00); // Default green ghost
            this.scene.add(this.previewBuilding);
        }
    }

    private setPreviewMaterial(building: Building, color: number) {
        building.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshPhongMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.5
                });
            }
        });
    }

    private onMouseMove(e: MouseEvent) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (this.previewBuilding) {
            const intersect = this.getTerrainIntersect();
            if (intersect) {
                const ix = Math.floor(intersect.point.x);
                const iz = Math.floor(intersect.point.z);
                const isOccupied = this.occupiedTiles.has(`${ix},${iz}`);

                this.previewBuilding.position.copy(intersect.point);
                this.previewBuilding.position.y = this.terrain.getHeightAt(ix, iz);
                this.previewBuilding.visible = true;

                // Visual feedback: red if blocked
                this.setPreviewMaterial(this.previewBuilding, isOccupied ? 0xff0000 : 0x00ff00);
            } else {
                this.previewBuilding.visible = false;
            }
        }
    }

    private onMouseDown(e: MouseEvent) {
        if (e.button !== 0 || !this.activeBuildingType) return;
        if ((e.target as HTMLElement).closest('#ui-menu')) return;

        const intersect = this.getTerrainIntersect();
        if (intersect) {
            const ix = Math.floor(intersect.point.x);
            const iz = Math.floor(intersect.point.z);
            
            if (!this.occupiedTiles.has(`${ix},${iz}`)) {
                this.placeBuilding(this.activeBuildingType, ix, iz);
            }
        }
    }

    private getTerrainIntersect() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain, true);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            point.x = Math.floor(point.x) + 0.5;
            point.z = Math.floor(point.z) + 0.5;
            return { ...intersects[0], point };
        }
        return null;
    }

    private placeBuilding(type: BuildingType, ix: number, iz: number) {
        const building = new Building(type);
        building.position.set(ix + 0.5, this.terrain.getHeightAt(ix, iz), iz + 0.5);
        this.scene.add(building);
        this.buildings.push(building);
        this.occupiedTiles.add(`${ix},${iz}`);
    }

    public update() {}
}
