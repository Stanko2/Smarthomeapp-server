import {Module} from "./Abstract/Module";
import {Device} from "./Abstract/Device";
import {db} from './Database';

export class ModuleLoader{
    private readonly modules: Module[];
    config;
    database;

    constructor() {
        this.config = require('./Config.json');
        this.modules = [];
        this.database = db;
        this.config.Modules.forEach(moduleConfig=>{
            if(moduleConfig.enabled) {
                try {
                    let module: any;
                    module = require(`./Modules/${moduleConfig.name}/${moduleConfig.name}`);
                    let ref = new module(moduleConfig.options, moduleConfig.name);
                    ref.db = this.database;
                    this.modules.push(ref);
                } catch (e) {
                    console.log(`Failed to load ${moduleConfig.name}: ${e}`);
                }
            }
        });
    }

    async listDevices(): Promise<any[]>{
        let out = [];
        for (const e of this.modules) {
           let dev = await e.getDevicesRequest();
           if(dev != null){
               dev.forEach(d=>out.push(d));
           }
        }
        return out;
    }

    async getAllDevices(): Promise<any>{
        let out = [];
        for (const e of this.modules) {
            let dev = await e.getDevices();
            if(dev != null){
                dev.forEach(d=>out.push(d));
            }
        }
        return out;
    }

    async findModuleForDevice(id:number) : Promise<Module>{
        let devices = await this.getAllDevices();
        let device = devices.find(e=> e.id === id);
        return device.controller;
    }

    async getDeviceById(id): Promise<Device>{
        let devices = await this.getAllDevices();
        let device = devices.find(e => e.id == id);
        return device;
    }

    getModule(name: string): Module{
        return this.modules.find(e=>e.name == name);
    }
}