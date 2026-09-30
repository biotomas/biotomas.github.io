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
        let totalConsumption = 0;
        let totalStorageCapacity = 0;
        const worldPos = new THREE.Vector3();
        
        for (const building of buildings) {
            if (building.type === BuildingType.SOLAR_PANEL) {
                building.getWorldPosition(worldPos);
                const intensity = this.sunSimulator.getSunIntensityAt(worldPos);
                totalProduction += 100 * intensity;
            } else if (building.type === BuildingType.BATTERY) {
                totalStorageCapacity += 500;
            } else if (building.type === BuildingType.HABITATION) {
                totalConsumption += 10;
            }
        }

        this._currentEnergyProduction = totalProduction;
        this._maxEnergyStorage = totalStorageCapacity;

        // Net change in energy
        const netEnergy = (totalProduction * 0.1) - totalConsumption;
        
        if (netEnergy > 0) {
            // Charging
            this._storedEnergy = Math.min(this._maxEnergyStorage, this._storedEnergy + netEnergy * deltaTime);
        } else {
            // Draining
            this._storedEnergy = Math.max(0, this._storedEnergy + netEnergy * deltaTime);
        }

        if (this._storedEnergy > this._maxEnergyStorage) {
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
