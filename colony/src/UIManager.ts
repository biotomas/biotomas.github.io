import { BuildingType } from './game/Building';
import { BuildingManager } from './game/BuildingManager';

export class UIManager {
    private menuContainer: HTMLElement;
    private buildingManager: BuildingManager;

    constructor(buildingManager: BuildingManager) {
        this.buildingManager = buildingManager;
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'ui-menu';
        this.applyStyles();
        this.createMenu();
        document.body.appendChild(this.menuContainer);
    }

    private applyStyles() {
        Object.assign(this.menuContainer.style, {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            border: '1px solid #444',
            zIndex: '100'
        });

        // Add CSS for buttons globally
        const style = document.createElement('style');
        style.textContent = `
            .ui-button {
                padding: 10px 20px;
                background: #333;
                color: white;
                border: 1px solid #555;
                cursor: pointer;
                font-family: sans-serif;
                font-size: 14px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .ui-button:hover {
                background: #444;
            }
            .ui-button.active {
                background: #3366ff;
                border-color: #6699ff;
            }
        `;
        document.head.appendChild(style);
    }

    private createMenu() {
        const types = [
            { label: 'Battery', type: BuildingType.BATTERY },
            { label: 'Solar Panel', type: BuildingType.SOLAR_PANEL },
            { label: 'Cancel', type: null }
        ];

        types.forEach(cfg => {
            const btn = document.createElement('button');
            btn.className = 'ui-button';
            btn.textContent = cfg.label;
            btn.onclick = () => {
                // Update active state
                Array.from(this.menuContainer.children).forEach(child => child.classList.remove('active'));
                if (cfg.type) btn.classList.add('active');
                
                this.buildingManager.setActiveBuildingType(cfg.type);
            };
            this.menuContainer.appendChild(btn);
        });
    }
}
