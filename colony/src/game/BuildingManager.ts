import * as THREE from 'three';
import { Building, BuildingType } from './Building';
import { Terrain } from './Terrain';

export class BuildingManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private terrain: Terrain;
    private buildings: Building[] = [];
    
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
            // Make preview transparent
            this.previewBuilding.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
            this.scene.add(this.previewBuilding);
        }
    }

    private onMouseMove(e: MouseEvent) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (this.previewBuilding) {
            const intersect = this.getTerrainIntersect();
            if (intersect) {
                this.previewBuilding.position.copy(intersect.point);
                this.previewBuilding.visible = true;
            } else {
                this.previewBuilding.visible = false;
            }
        }
    }

    private onMouseDown(e: MouseEvent) {
        // Only place on left click and if we have an active building type
        if (e.button !== 0 || !this.activeBuildingType) return;
        
        // Check if we clicked on UI (very simple check for now)
        if ((e.target as HTMLElement).closest('#ui-menu')) return;

        const intersect = this.getTerrainIntersect();
        if (intersect) {
            this.placeBuilding(this.activeBuildingType, intersect.point);
        }
    }

    private getTerrainIntersect() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Intersect with the terrain group
        const intersects = this.raycaster.intersectObject(this.terrain, true);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Snapping to grid (assuming tileSize = 1)
            // We snap to the center of the tile
            point.x = Math.floor(point.x) + 0.5;
            point.z = Math.floor(point.z) + 0.5;
            
            // For Y, we keep the original intersect height for now 
            // (or we could sample the terrain height at this specific grid point)
            return { ...intersects[0], point };
        }
        return null;
    }

    private placeBuilding(type: BuildingType, position: THREE.Vector3) {
        const building = new Building(type);
        building.position.copy(position);
        this.scene.add(building);
        this.buildings.push(building);
        
        // Reset selection after placement? 
        // For now, let's keep it selected for multiple placements.
        // If you want to deselect: this.setActiveBuildingType(null);
    }

    public update() {
        // Any per-frame updates for buildings
    }
}
