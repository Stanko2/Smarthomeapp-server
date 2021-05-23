import {Device} from "./Device";
import {EventEmitter} from "events";
import {db} from '../Database';

export abstract class Module{
    protected devices: Device[];
    updated: number;
    public name: string;
    protected db;
    protected event: EventEmitter;

    constructor(args: any, name: string) {
        this.db = db;
        this.event = new EventEmitter();
        this.name = name;
        this.initialize(args).then(()=>{
            this.log('Loaded');
        });

    }

    abstract initialize(args: any);

    abstract getDevices(): Promise<Device[]>;

    async getDevicesRequest(): Promise<any>{
        let ret = [];
        let devices = await this.getDevices();
        for (const e of devices) {
            let data = e.toObject();
            if(!e.isOn){
                data.props = (await db.devices.findOne({id: e.id})).props;
            }
            ret.push(data);
        }
        return ret;
    }

    async setDeviceRequest(device: Device, newStatus: any): Promise<any>{
        if(device.isOn || device.isOn != newStatus.isOn){
            let dbStatus = await db.devices.findOne({id: device.id});
            Object.keys(dbStatus.props).forEach(e=>{
                if(newStatus[e] == null){
                    newStatus[e] = dbStatus.props[e];
                }
            });
            try{
                let dev = await this.setDevice(device, newStatus);
                await db.devices.updateOne({id: device.id}, {$set: {props: newStatus}});
                return dev.toObject();
            }
            catch(err){
                this.log(err);
            }
        }
        this.log(`Device ${newStatus.id} turned off, setting new state in database`);
        Object.keys(device.props).forEach(e=>{
            if(newStatus[e] == null){
                newStatus[e] = device.props[e];
            }
        });
        await db.devices.updateOne({id: device.id}, {$set: {props: newStatus}});
        return await db.devices.findOne({id: device.id});
    }

    abstract setDevice(device: Device, newStatus: any): Promise<Device>;

    findDeviceById(id:number): Device{
        return this.devices.find(e=> e.id === id) as Device;
    }

    fireEvent(event: string, deviceId:number){
        this.event.emit(event, { id:deviceId });
    }

    log(msg): void{
        console.log(`[ ${new Date().toString().substring(0,24)} ]: ${this.name}: ${msg}`);
    }
}
