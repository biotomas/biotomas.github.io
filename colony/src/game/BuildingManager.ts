import * as THREE from 'three';
import { Building, BuildingType } from './Building';
import { Terrain } from './Terrain';
import { TileHighlight } from './TileHighlight';

export class BuildingManager {
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

    private lastMouseScreenX: number = -1;
    private lastMouseScreenY: number = -1;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, terrain: Terrain) {
        this.camera = camera;
        this.terrain = terrain;
        this.placementGroup = scene; 

        this.tileHighlight = new TileHighlight();
    }

    public setActiveBuildingType(type: BuildingType | null) {
        this.activeBuildingType = type;

        if (this.previewBuilding) {
            this.placementGroup.remove(this.previewBuilding);
            this.previewBuilding = null;
        }

        if (type) {
            this.previewBuilding = new Building(type);
            this.setPreviewMaterial(this.previewBuilding, 0x00ff00);
            this.placementGroup.add(this.previewBuilding);
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

        if (this.tileHighlight.parent !== this.placementGroup) {
            this.placementGroup.add(this.tileHighlight);
        }

        const intersect = this.getTerrainIntersect();
        if (intersect) {
            const faceInfo = this.terrain.getFaceInfo(intersect);
            if (faceInfo) {
                const { center, id, vA, vB, vC } = faceInfo;

                const localVA = vA.clone();
                const localVB = vB.clone();
                const localVC = vC.clone();
                this.placementGroup.worldToLocal(localVA);
                this.placementGroup.worldToLocal(localVB);
                this.placementGroup.worldToLocal(localVC);

                this.tileHighlight.updateTriangle(localVA, localVB, localVC);
                this.tileHighlight.setVisible(true);

                if (this.previewBuilding) {
                    const localCenter = center.clone();
                    this.placementGroup.worldToLocal(localCenter);
                    
                    const localNormal = localCenter.clone().normalize();
                    const isOccupied = this.occupiedTiles.has(id);
                    
                    this.previewBuilding.position.copy(localCenter);
                    this.previewBuilding.alignToNormal(localNormal);
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
        const localPos = faceInfo.center.clone();
        this.placementGroup.worldToLocal(localPos);
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

    public update() {
        if (this.lastMouseScreenX !== -1) {
            const fakeEvent = { clientX: this.lastMouseScreenX, clientY: this.lastMouseScreenY } as MouseEvent;
            this.onMouseMove(fakeEvent);
        }
    }

    public initEvents() {
        window.addEventListener('mousemove', (e) => {
            this.lastMouseScreenX = e.clientX;
            this.lastMouseScreenY = e.clientY;
            this.onMouseMove(e);
        });
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    }
}
