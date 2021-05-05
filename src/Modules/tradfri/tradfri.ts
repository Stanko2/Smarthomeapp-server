import {Module} from "../../Abstract/Module";
import {Device, deviceType} from "../../Abstract/Device";
import * as client from "node-tradfri-client";
import {Accessory, TradfriClient} from "node-tradfri-client";
import Color = require("color");

class Tradfri extends Module{
    securityKey: string;
    controller: client.TradfriClient;
    lights: Record<number, client.Accessory>

    async initialize(props) {
        this.securityKey = props.securityKey;
        this.lights = {};
        this.devices = [];
        await this.connect()
        this.log('Connected to gateway')
    }

     async getDevices(): Promise<Device[]>{
        this.devices.forEach(e=>{
            let light = this.lights[e.id].lightList[0];
            let color = Color('#'+light.color);
            let saved = e as Light;
            saved.update({color: color, intensity: light.dimmer});
            saved.online =  this.lights[e.id].alive;
        });
        return this.devices;
    };

    async setDevice(device: Device, newStatus): Promise<Light> {
        let light = this.lights[device.id].lightList[0];
        let lightObject = device as Light;
        if(newStatus.isOn){
            await light.turnOn();
            if(device.options.hasDimmer && newStatus.intensity != null){
                await light.setBrightness(newStatus.intensity);
                lightObject.props.intensity = newStatus.intensity;
            }
            if(device.options.hasColor === "rgb" && newStatus.color != null){
                await light.setColor(Color.rgb(newStatus.color.r, newStatus.color.g, newStatus.color.b).hex().substring(1));
                lightObject.update({color: Color.rgb(newStatus.color.r, newStatus.color.g, newStatus.color.b)});
            }
        }
        else{
            await light.turnOff();
        }
        lightObject.isOn = newStatus.isOn;
        return lightObject;
    }

    async connect(): Promise<void>{
        const gateway = await client.discoverGateway();
        if(gateway == undefined) throw new Error('Failed to find gateway');
        this.controller = new TradfriClient(gateway.addresses[0]);
        const auth = await this.controller.authenticate(this.securityKey);
        await this.controller.connect(auth.identity, auth.psk);
        await this.controller.on("device updated", e=>{
           if(e.type === client.AccessoryTypes.lightbulb && e.lightList[0].dimmer != undefined){
               if(!this.lights.hasOwnProperty(e.instanceId)){
                   this.devices.push(new Light(e.instanceId, e.name, this, e.lightList[0].isDimmable, e.lightList[0].spectrum));
                   this.lights[e.instanceId] = e;
               }
               let dev = this.findDeviceById(e.instanceId);
               dev.updatedAt = Date.now();
               dev.update({intensity: e.lightList[0].dimmer, color: Color('#'+ e.lightList[0].color), power: e.lightList[0].onOff});
               this.log('New device: '+ e.name);
               this.db.addDevice(dev).catch(err=>this.db.updateDevice(dev));

           }

        }).on("device removed", (id)=>{
            if(!this.lights.hasOwnProperty(id)) return;
            this.log(`Device ${id} is offline`);
            this.findDeviceById(id).online = false;
        }).observeDevices();
    }
}

class Light extends Device{
    type = <deviceType> {
        icon: 'lightbulb_outline',
        id: 4,
        name: 'Lampa',
    }
    color: Color;

    constructor(id:number, name:string, controller:Module, isDimmable:boolean, colorMode) {
        super(id,name, controller, {hasDimmer: isDimmable, hasColor: colorMode});
        this.props = {};
    }

    public getStatus(): any {
        this.updatedAt = Date.now();
        return this.toObject();
    }

    public setStatus(newStatus): void {
        this.updatedAt = Date.now();
        this.controller.setDevice(this, newStatus);
    }

    // toObject(): any {
    //     return {
    //         id: this.id,
    //         isOn: this.power,
    //         name: this.name,
    //         updated: this.updatedAt,
    //         props:{
    //             intensity: this.intensity,
    //             color:{
    //                 r: this.color.red(),
    //                 g: this.color.green(),
    //                 b: this.color.blue()
    //             },
    //         },
    //         type: 4,
    //         online: this.online,
    //         controlsHeight: this.controlsHeight,
    //     }
    // }

    update(props: any): void {
        if(props.intensity != null) this.props.intensity = props.intensity;
        if(props.color != null) this.props.color = {r:props.color.red(), g: props.color.green(), b: props.color.blue()};
        if(props.power != null) this.isOn = props.power;
    }
    getControls() {
        super.getControls();
        let controls = [];
        if(this.options.hasDimmer)
            controls.push(this.Slider("intensity", 'Intensity', 0,100));
        if(this.options.hasColor == 'rgb')
            controls.push(this.ColorPicker("color", "Color"));
        return controls;

    }
}

module .exports = Tradfri;