import { BuildingManager } from './BuildingManager';
import { SunSimulator } from './SunSimulator';
import { BuildingType } from './Building';
import * as THREE from 'three';

export class ResourceManager {
    private buildingManager: BuildingManager;
    private sunSimulator: SunSimulator;

    private _currentEnergyProduction: number = 0;
    private _storedEnergy: number = 0;
    private _maxEnergyStorage: number = 0;

    private lastUpdate: number = Date.now();

    constructor(buildingManager: BuildingManager, sunSimulator: SunSimulator) {
        this.buildingManager = buildingManager;
        this.sunSimulator = sunSimulator;
    }

    public update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // in seconds
        this.lastUpdate = now;

        this.calculateEnergyStats(deltaTime);
    }

    private calculateEnergyStats(deltaTime: number) {
        const buildings = this.buildingManager.getBuildings();
        
        let totalProduction = 0;
        let totalStorageCapacity = 0;
        const worldPos = new THREE.Vector3();
        
        for (const building of buildings) {
            if (building.type === BuildingType.SOLAR_PANEL) {
                building.getWorldPosition(worldPos);
                const intensity = this.sunSimulator.getSunIntensityAt(worldPos);
                totalProduction += 100 * intensity;
            } else if (building.type === BuildingType.BATTERY) {
                totalStorageCapacity += 500;
            }
        }

        this._currentEnergyProduction = totalProduction;
        this._maxEnergyStorage = totalStorageCapacity;

        // Charge batteries at 10% of current production per second
        if (this._storedEnergy < this._maxEnergyStorage) {
            const chargeRate = totalProduction * 0.1;
            this._storedEnergy = Math.min(this._maxEnergyStorage, this._storedEnergy + chargeRate * deltaTime);
        } else if (this._storedEnergy > this._maxEnergyStorage) {
            this._storedEnergy = this._maxEnergyStorage;
        }
    }

    public get currentEnergyProduction(): number {
        return this._currentEnergyProduction;
    }

    public get storedEnergy(): number {
        return this._storedEnergy;
    }

    public get maxEnergyStorage(): number {
        return this._maxEnergyStorage;
    }
}
