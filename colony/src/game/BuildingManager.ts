import * as THREE from 'three';
import { Building, BuildingType } from './Building';
import { Terrain } from './Terrain';
import { TileHighlight } from './TileHighlight';

export class BuildingManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private terrain: Terrain;
    private buildings: Building[] = [];
    private occupiedTiles: Set<string> = new Set();
    private tileHighlight: TileHighlight;
    
    private activeBuildingType: BuildingType | null = null;
    private previewBuilding: Building | null = null;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, terrain: Terrain) {
        this.scene = scene;
        this.camera = camera;
        this.terrain = terrain;

        this.tileHighlight = new TileHighlight();
        this.scene.add(this.tileHighlight);

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

        const intersect = this.getTerrainIntersect();
        if (intersect) {
            const ix = Math.floor(intersect.point.x);
            const iz = Math.floor(intersect.point.z);
            const height = this.terrain.getHeightAt(ix, iz);

            this.tileHighlight.updatePosition(ix, height, iz);
            this.tileHighlight.setVisible(true);

            if (this.previewBuilding) {
                const isOccupied = this.occupiedTiles.has(`${ix},${iz}`);
                this.previewBuilding.position.set(ix + 0.5, height, iz + 0.5);
                this.previewBuilding.visible = true;
                this.setPreviewMaterial(this.previewBuilding, isOccupied ? 0xff0000 : 0x00ff00);
            }
        } else {
            this.tileHighlight.setVisible(false);
            if (this.previewBuilding) {
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

    private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    private getTerrainIntersect() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Try mesh raycasting first
        const intersects = this.raycaster.intersectObject(this.terrain.getMesh());
        if (intersects.length > 0) {
            return intersects[0];
        }

        // Fallback: Plane intersection for when the mouse is slightly off the mesh 
        // but still over the intended grid area
        const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
            return { point: intersectPoint };
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
