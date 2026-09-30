import * as THREE from 'three';

export enum BuildingType {
    BATTERY = 'battery',
    SOLAR_PANEL = 'solar_panel',
    LIGHTHOUSE = 'lighthouse'
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
            case BuildingType.LIGHTHOUSE:
                this.createLighthouseModel();
                break;
        }
    }

    private createBatteryModel() {
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3366ff });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        this.add(body);

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
        const standGeo = new THREE.CylinderGeometry(0.05, 0.1, 0.3);
        const standMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.y = 0.15;
        stand.castShadow = true;
        stand.receiveShadow = true;
        this.add(stand);

        const panelGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
        const panelMat = new THREE.MeshPhongMaterial({ color: 0x112244, specular: 0x555555 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.y = 0.4;
        panel.rotation.x = Math.PI / 6;
        panel.castShadow = true;
        panel.receiveShadow = true;
        this.add(panel);
    }

    private createLighthouseModel() {
        // Main Tower
        const towerGeo = new THREE.CylinderGeometry(0.4, 0.8, 4, 8);
        const towerMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 2;
        tower.castShadow = true;
        tower.receiveShadow = true;
        this.add(tower);

        // Tower bands (red)
        const bandGeo = new THREE.CylinderGeometry(0.61, 0.71, 0.5, 8);
        const bandMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const band1 = new THREE.Mesh(bandGeo, bandMat);
        band1.position.y = 1;
        this.add(band1);
        const band2 = new THREE.Mesh(bandGeo, bandMat);
        band2.position.y = 3;
        this.add(band2);

        // Lantern Room
        const lanternGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8);
        const lanternMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.y = 4.4;
        this.add(lantern);

        // The Light
        const pointLight = new THREE.PointLight(0xffcc00, 3, 30);
        pointLight.position.set(0, 4.4, 0);
        pointLight.castShadow = true;
        this.add(pointLight);

        // Visual bulb
        const bulbGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff000 });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.y = 4.4;
        this.add(bulb);
    }

    public alignToNormal(normal: THREE.Vector3) {
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    }
}
