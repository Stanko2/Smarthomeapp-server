import * as node from "node-tradfri-client";
import Color = require("color");
import bodyparser = require('body-parser');
import * as Timer from '../src/Timers'
import {changeAirConditioner, initHandlers, klima, klimy, listDevices } from '../src/Klima'
import * as cors from 'cors';

export const app = require('express')();
const http = require('http');
const server = http.Server(app)


const devices = {
    deviceCount: 0,
    devices: []
};

app.use(cors())
app.options('*', cors())

//#region Tradfri
// securityId: 'KXdjZCuDx3GCKJgf',
// hubIpAddress: '192.168.0.165',
let tradfri: node.TradfriClient;
export type light = {
    isOn: boolean,
    name: string,
    intensity: number,
    color:{r: number, g: number, b: number},
    type: 0,
    id: number
}
async function connect(){
    const gateway = await node.discoverGateway();
    const tradfri: node.TradfriClient = new node.TradfriClient(gateway.addresses[0]);
    const auth = await tradfri.authenticate('KXdjZCuDx3GCKJgf');
    await tradfri.connect(auth.identity, auth.psk);
    tradfri.removeAllListeners();
    await tradfri
    .on("device updated", (device) => tradfri_deviceUpdated(device))
    // .on("device removed", (device) => tradfri_deviceRemoved(device))
    .on("group updated", (group) => tradfri_groupUpdated(group)).observeDevices();
    
    // console.log(tradfri.groups);
    // setTimeout(() => Blink(), 2000);
    return tradfri;
    // tradfri.destroy();
}
connect().catch((err)=>console.log(err));
const lightbulbs: Record<number, node.Accessory> = {};
const groups: Record<number, node.Group> = {};

function Blink() {
    Object.keys(lightbulbs).forEach((id: string) => {
        const light = lightbulbs[id];
        light.lightList[0].turnOn();
        setInterval(() => light.lightList[0].setColor(Color.rgb(Math.random()*255, Math.random()*255, Math.random()*255).hex().substring(1), 0), 3000);
    });
}
function tradfri_deviceUpdated(device: node.Accessory){
    // var names = Object.keys(devices);
    // names.forEach((a)=>{
    //     if(isObject(devices[a])){
    //         if(devices[a].id === device.name){
    //             lightbulbs[device.instanceId] = device;
    //             const color = Color('#'+device.lightList[0].color.toUpperCase());
    //             devices[a].color = {
    //                 r: color.red(),
    //                 g: color.green(),
    //                 b: color.blue()
    //             };
    //             devices[a].isOn = device.lightList[0].onOff;
    //             devices[a].intensity = device.lightList[0].dimmer;
    //         };
    //     }
    // });
    if(device.type === node.AccessoryTypes.lightbulb){
        lightbulbs[device.instanceId] = device;
        // devices.deviceCount++;
        // var color = Color('#'+device.lightList[0].color.toUpperCase());
        // devices['device'+devices.deviceCount] = <light>{
        //     isOn: device.lightList[0].onOff,
        //     name: device.name,
        //     intensity: device.lightList[0].dimmer,
        //     color:{
        //         r: color.red(),
        //         g: color.green(),
        //         b: color.blue()
        //     },
        //     type: 0,
        //     id: device.instanceId,
        // }
    }
}
function tradfri_deviceRemoved(id: number){
    lightbulbs[id] = undefined;
}
function tradfri_groupUpdated(group: node.Group){
    groups[group.instanceId] = group;
}
export async function changeLight(status: light){
    const light: node.Light = lightbulbs[status.id].lightList[0];
    if(status.isOn){
        await light.turnOn();
        await light.setColor(Color.rgb(status.color.r, status.color.g, status.color.b).hex().substring(1), 0);
        await light.setBrightness(status.intensity, 0);
    }
    else
        await light.turnOff();
    return status;
}
//#endregion
server.listen(8000,'192.168.0.105');
initHandlers();
listDevices();
app.use(bodyparser.json())

function Getlight(key: string) {
    const light: node.Light = lightbulbs[key].lightList[0];
    const color = Color('#' + light.color);
    const device = <light>{
        isOn: light.onOff,
        intensity: light.dimmer,
        color: {r: color.red(), g: color.green(), b: color.blue()},
        name: lightbulbs[key].name,
        id: lightbulbs[key].instanceId,
        type: 0,
    }
    return device;
}

app.get('/devices',(_request, response)=>{
    if(tradfri == null){
        connect().then((result)=>{
            tradfri = result;    
        });
    }
    devices.deviceCount = 0;
    devices.devices = [];
    Object.keys(lightbulbs).forEach((key:string, index: number)=>{
        const device = Getlight(key);
        devices.deviceCount++;
        devices.devices[index] = device;
    });
    const lights: number = devices.deviceCount
    Object.keys(klimy).forEach((key: string, index: number)=>{
        devices.devices[lights + index] = klimy[key];
        devices.deviceCount++;
    });
    response.send(devices);
    response.end();
});

app.post('/change', (request, response)=>{
    let newStatus: Promise<light | klima>;
    if(request.body.type === 0){
        newStatus = changeLight(request.body)
    }
    else if(request.body.type === 1){
        newStatus = changeAirConditioner(request.body)
    }
    newStatus.then((value)=>{
        value['status'] = 'OK'; response.send(value);
    }).catch((err)=> response.send({status: 'ERR', message: err}));
});

app.get('/timers', (req,res)=>{
    res.send(Timer.ListTimers());
    console.log(Timer.ListTimers());
});

app.post('/addTimer', (req,res)=>{
    res.send(Timer.AddTimer())
});

app.post('/timerChange', (req,res)=>{
    try{
        Timer.ChangeTimer(req.body.id, req.body);
        res.send({status: 'OK'})
    }
    catch(e){
        console.log(e);
        res.send({status:'ERR', message: e})
    }
});

app.post('/removeTimer', (req,res)=>{
    Timer.DeleteTimer(req.body.id);
    res.send({status: 'OK'})
});
app.post('/update', (res,req)=>{
   const id = req.body.id;
   const type = req.body.type;
   if(type === 0) res.send(Getlight(id));
   else if(type === 1) res.send(klimy[id]);
});
