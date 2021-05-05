import {Device} from "./Abstract/Device";
import {api} from "./App";

export class DeviceGroup {
    devices: any[];
    types: any[];
    id: number;
    name: string;

    constructor(name, id, devices = null) {
        if(devices != undefined){
            this.devices = devices;
            this.updateTypes();
        }
        this.id = id;
        this.name = name;
    }

    async updateTypes(){
        this.types = [];
        let typeIds: number[] = [];
        for (let i = 0; i < this.devices.length; i++){
            let e = this.devices[i];
            if(this.devices[i].controller == null){
                let dev = await api.moduleController.getDeviceById(e.id);
                if(dev == null) continue;
                else this.devices[i] = dev;
                e = dev;
            }
            if(typeIds.includes(e.type.id)) continue;
            this.types.push({
                type: e.type,
                controls: e.getControls(),
                device: e,
                switchable: true,
            });
            typeIds.push(e.type.id);
        }
    }

    async getControls(){
        let ret = [];
        if(this.types.length == 0 && this.devices.length > 0) await this.updateTypes();
        for (const e of this.types) {
            let d = {
                icon: e.type.icon,
                id: e.type.id,
            }
            let isOn = '';
            for (let i = 0; i < this.devices.length; i++) {
                let dev = this.devices[i];
                if(this.devices[i].controller == null){
                    dev = await api.moduleController.getDeviceById(this.devices[i].id);
                    if(dev == null) continue;
                    else this.devices[i] = dev;
                }

                if(this.devices[i].type.id != e.type.id || dev.isOn == null) continue;
                if(dev.isOn){
                    if(isOn == 'off'){
                        isOn = 'some';
                        break;
                    }
                    else{
                        isOn = 'on';
                    }
                }
                else{
                    if(isOn == 'on'){
                        isOn = 'some';
                        break;
                    }
                    else{
                        isOn = 'off';
                    }
                }
            }
            d['isOn'] = isOn;
            ret.push(d);
        }
        return ret;
    }

    async getDeviceControls(typeId: number){
        if(this.types.length == 0) {
            this.updateTypes();
            return null;
        }
        let type = this.types.find(e=>e.type.id == typeId);
        return {
            mainControls: type.controls,
        };
    }

    getSaveJson(){
        return{
            name: this.name,
            id: this.id,
            devices: this.devices.map(e=>e.controller == null ? e : e.id),
        }
    }

    async toggle(typeId: number){
        let devs: Device[] = this.devices.filter(e=>e.controller != null && e.type.id == typeId);
        for (const e of devs) {
            await e.controller.setDeviceRequest(e,{isOn: !e.isOn});
        }
        // console.log(devs.map(e=>e.isOn));
    }

    async setStatus(typeId: number, newStatus: any){
        let devs: Device[] = this.devices.filter(e=>e.controller != null && e.type.id == typeId);
        let operations = [];
        for( const e of devs){
            operations.push(e.controller.setDeviceRequest(e, newStatus));
        }
        return await Promise.all(operations);
    }

    async getStatus(typeId: number) {
        if(this.types.length == 0) await this.updateTypes();
        let type = this.types.find(e=>e.type.id == typeId);
        let dev = type.device.toObject();
        dev.name = this.name;
        return dev;
    }
}