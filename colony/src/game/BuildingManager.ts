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
            const faceInfo = this.terrain.getFaceInfo(intersect);
            if (faceInfo) {
                const { center, normal, id, vA, vB, vC } = faceInfo;

                this.tileHighlight.updateTriangle(vA, vB, vC);
                this.tileHighlight.setVisible(true);

                if (this.previewBuilding) {
                    const isOccupied = this.occupiedTiles.has(id);
                    this.previewBuilding.position.copy(center);
                    this.previewBuilding.alignToNormal(normal);
                    this.previewBuilding.visible = true;
                    this.setPreviewMaterial(this.previewBuilding, isOccupied ? 0xff0000 : 0x00ff00);
                }
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
            const faceInfo = this.terrain.getFaceInfo(intersect);
            if (faceInfo && !this.occupiedTiles.has(faceInfo.id)) {
                this.placeBuilding(this.activeBuildingType, faceInfo);
            }
        }
    }

    private getTerrainIntersect() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.getMesh(), true);
        return intersects.length > 0 ? intersects[0] : null;
    }

    private placeBuilding(type: BuildingType, faceInfo: any) {
        const building = new Building(type);
        
        // Find local position relative to the asteroid group
        const localPos = faceInfo.center.clone();
        this.placementGroup.worldToLocal(localPos);
        
        // Find local normal
        // Since it's a sphere at origin, we can just use localPos normalized
        const localNormal = localPos.clone().normalize();

        building.position.copy(localPos);
        building.alignToNormal(localNormal);
        
        this.placementGroup.add(building);
        this.buildings.push(building);
        this.occupiedTiles.add(faceInfo.id);
    }

    public getBuildings(): Building[] {
        return this.buildings;
    }

    public update() {}
}
