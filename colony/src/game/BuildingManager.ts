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
    
    // Group where buildings are placed (the rotating asteroid)
    public placementGroup: THREE.Object3D;

    private activeBuildingType: BuildingType | null = null;
    private previewBuilding: Building | null = null;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, terrain: Terrain) {
        this.scene = scene;
        this.camera = camera;
        this.terrain = terrain;
        this.placementGroup = scene; 

        this.tileHighlight = new TileHighlight();
        // Highlight stays in world space for easier mouse tracking
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
            this.setPreviewMaterial(this.previewBuilding, 0x00ff00);
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
            // Get position in world space
            const worldPos = intersect.point;
            const normal = worldPos.clone().normalize();
            const surfacePos = this.terrain.getSurfacePoint(normal);

            this.tileHighlight.updatePosition(surfacePos.x, surfacePos.y, surfacePos.z);
            this.tileHighlight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            this.tileHighlight.setVisible(true);

            if (this.previewBuilding) {
                // To check occupation, we need the local coordinate relative to the rotating asteroid
                const localPos = worldPos.clone();
                this.placementGroup.worldToLocal(localPos);
                const localNormal = localPos.clone().normalize();
                
                const lat = Math.round(Math.asin(localNormal.y) * 10) / 10;
                const lon = Math.round(Math.atan2(localNormal.x, localNormal.z) * 10) / 10;
                const tileKey = `${lat.toFixed(1)},${lon.toFixed(1)}`;

                const isOccupied = this.occupiedTiles.has(tileKey);
                
                this.previewBuilding.position.copy(surfacePos);
                this.previewBuilding.alignToNormal(normal);
                this.previewBuilding.visible = true;
                this.setPreviewMaterial(this.previewBuilding, isOccupied ? 0xff0000 : 0x00ff00);
            }
        } else {
            this.tileHighlight.setVisible(false);
            if (this.previewBuilding) this.previewBuilding.visible = false;
        }
    }

    private onMouseDown(e: MouseEvent) {
        if (e.button !== 0 || !this.activeBuildingType) return;
        if ((e.target as HTMLElement).closest('#ui-menu')) return;

        const intersect = this.getTerrainIntersect();
        if (intersect) {
            const worldPos = intersect.point;
            const localPos = worldPos.clone();
            this.placementGroup.worldToLocal(localPos);
            const localNormal = localPos.clone().normalize();

            const lat = Math.round(Math.asin(localNormal.y) * 10) / 10;
            const lon = Math.round(Math.atan2(localNormal.x, localNormal.z) * 10) / 10;
            const tileKey = `${lat.toFixed(1)},${lon.toFixed(1)}`;
            
            if (!this.occupiedTiles.has(tileKey)) {
                this.placeBuilding(this.activeBuildingType, localNormal, tileKey);
            }
        }
    }

    private getTerrainIntersect() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Intersect with the terrain mesh which is inside the rotating group
        const intersects = this.raycaster.intersectObject(this.terrain.getMesh(), true);
        return intersects.length > 0 ? intersects[0] : null;
    }

    private placeBuilding(type: BuildingType, localNormal: THREE.Vector3, tileKey: string) {
        const building = new Building(type);
        // Position relative to the placement group (asteroid)
        const localSurfacePos = localNormal.clone().multiplyScalar(this.terrain.getRadiusAt());
        building.position.copy(localSurfacePos);
        building.alignToNormal(localNormal);
        
        this.placementGroup.add(building);
        this.buildings.push(building);
        this.occupiedTiles.add(tileKey);
    }

    public getBuildings(): Building[] {
        return this.buildings;
    }

    public update() {}
}
