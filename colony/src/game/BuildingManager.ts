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
            const normal = intersect.point.clone().normalize();
            const pos = this.terrain.getSurfacePoint(normal);

            // Simple lat/long snap for highlights
            const lat = Math.round(Math.asin(normal.y) * 10) / 10;
            const lon = Math.round(Math.atan2(normal.x, normal.z) * 10) / 10;
            const tileKey = `${lat.toFixed(1)},${lon.toFixed(1)}`;

            this.tileHighlight.updatePosition(pos.x, pos.y, pos.z);
            this.tileHighlight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            this.tileHighlight.setVisible(true);

            if (this.previewBuilding) {
                const isOccupied = this.occupiedTiles.has(tileKey);
                this.previewBuilding.position.copy(pos);
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
            const normal = intersect.point.clone().normalize();
            const lat = Math.round(Math.asin(normal.y) * 10) / 10;
            const lon = Math.round(Math.atan2(normal.x, normal.z) * 10) / 10;
            const tileKey = `${lat.toFixed(1)},${lon.toFixed(1)}`;
            
            if (!this.occupiedTiles.has(tileKey)) {
                this.placeBuilding(this.activeBuildingType, normal, tileKey);
            }
        }
    }

    private getTerrainIntersect() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.getMesh());
        return intersects.length > 0 ? intersects[0] : null;
    }

    private placeBuilding(type: BuildingType, normal: THREE.Vector3, tileKey: string) {
        const building = new Building(type);
        const pos = this.terrain.getSurfacePoint(normal);
        building.position.copy(pos);
        building.alignToNormal(normal);
        this.scene.add(building);
        this.buildings.push(building);
        this.occupiedTiles.add(tileKey);
    }

    public getBuildings(): Building[] {
        return this.buildings;
    }

    public update() {}
}
