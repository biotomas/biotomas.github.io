import { BuildingManager } from './BuildingManager';
import { SunSimulator } from './SunSimulator';
import { BuildingType } from './Building';
import * as THREE from 'three';

export class ResourceManager {
    private buildingManager: BuildingManager;
    private sunSimulator: SunSimulator;

    private _currentEnergyProduction: number = 0;

    constructor(buildingManager: BuildingManager, sunSimulator: SunSimulator) {
        this.buildingManager = buildingManager;
        this.sunSimulator = sunSimulator;
    }

    public update() {
        this.calculateEnergyProduction();
    }

    private calculateEnergyProduction() {
        const buildings = this.buildingManager.getBuildings();
        
        let totalProduction = 0;
        const worldPos = new THREE.Vector3();
        
        for (const building of buildings) {
            if (building.type === BuildingType.SOLAR_PANEL) {
                // Get world position of the building to check its orientation relative to the fixed sun
                building.getWorldPosition(worldPos);
                const intensity = this.sunSimulator.getSunIntensityAt(worldPos);
                totalProduction += 100 * intensity;
            }
        }

        this._currentEnergyProduction = totalProduction;
    }

    public get currentEnergyProduction(): number {
        return this._currentEnergyProduction;
    }
}
