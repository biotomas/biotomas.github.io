import { BuildingManager } from './BuildingManager';
import { SunSimulator } from './SunSimulator';
import { BuildingType } from './Building';

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
        const sunIntensity = this.sunSimulator.getSunIntensity();
        
        let totalProduction = 0;
        
        for (const building of buildings) {
            if (building.type === BuildingType.SOLAR_PANEL) {
                totalProduction += 100 * sunIntensity;
            }
        }

        this._currentEnergyProduction = totalProduction;
    }

    public get currentEnergyProduction(): number {
        return this._currentEnergyProduction;
    }
}
