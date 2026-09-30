import * as THREE from 'three';

export enum BuildingType {
    BATTERY = 'battery',
    SOLAR_PANEL = 'solar_panel'
}

export class Building extends THREE.Group {
    constructor(public type: BuildingType) {
        super();
        this.createModel();
    }

    private createModel() {
        switch (this.type) {
            case BuildingType.BATTERY:
                this.createBatteryModel();
                break;
            case BuildingType.SOLAR_PANEL:
                this.createSolarPanelModel();
                break;
        }
    }

    private createBatteryModel() {
        // Battery body
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3366ff });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        this.add(body);

        // Terminals
        const termGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const termMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
        
        const t1 = new THREE.Mesh(termGeo, termMat);
        t1.position.set(0.15, 0.85, 0);
        t1.castShadow = true;
        t1.receiveShadow = true;
        this.add(t1);

        const t2 = new THREE.Mesh(termGeo, termMat);
        t2.position.set(-0.15, 0.85, 0);
        t2.castShadow = true;
        t2.receiveShadow = true;
        this.add(t2);
    }

    private createSolarPanelModel() {
        // Base/Stand
        const standGeo = new THREE.CylinderGeometry(0.05, 0.1, 0.3);
        const standMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.y = 0.15;
        stand.castShadow = true;
        stand.receiveShadow = true;
        this.add(stand);

        // Panel
        const panelGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
        const panelMat = new THREE.MeshPhongMaterial({ color: 0x112244, specular: 0x555555 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.y = 0.4;
        panel.rotation.x = Math.PI / 6; // Angled towards "sun"
        panel.castShadow = true;
        panel.receiveShadow = true;
        this.add(panel);
    }
}
