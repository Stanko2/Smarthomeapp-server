import {Module} from "../../Abstract/Module";
import {Device, deviceType, dropDownItem} from "../../Abstract/Device";
import {spawn, ChildProcessWithoutNullStreams} from 'child_process';
import {join} from 'path';

function parseBool(b:boolean){
    if (b) return 1;
    else return 0;
}
function parseMode(m: number){
    switch (m) {
        case 0:
            return 2;
        case 1:
            return 4;
        case 2:
            return 3;
        case 3:
            return 5;
        case 4:
            return 1;
        default:
            break;
    }
}
function parseSwing(s: number){
    switch (s) {
        case 0:
            return 0x0;
        case 1:
            return 0x3;
        case 2:
            return 0xC;
        case 3:
            return 0xF;
        default:
            break;
    }
}
function parseFan(f:number){
    switch (f) {
        case 0:
            return 40;
        case 1:
            return 60;
        case 2:
            return 80;
        case 3:
            return 102;
        case 4:
            return 20;
        default:
            break;
    }
}

class Klima extends Module{
    error: String = "";
    busy: Boolean = false;
    static started: Boolean = false;
    data: any;
    command: ChildProcessWithoutNullStreams;
    lastRequest: number = 0;

    async initialize(props: any) {
        
        this.command = spawn('python3', [join(__dirname, 'Klima.py'), 'listen'], {env: props });
        this.devices = [];
        this.initHandlers();
        setTimeout(()=>this.initDevices().then(() => this.log('devices initialized')), 3000)
    }

    async initDevices(){
        await this.makeRequest('list');
        this.parseDevices(require('../../result.json'));
        setInterval(()=>this.updateDevices(), 10000);
    }

    initHandlers(){
        Klima.started = true;
        this.command.stdout.on('data', (data: string) => {
            // this.log(`Python output: \n${data}`);
            if(data.includes('ERR')){
                this.log('Exception: ' + data);
                this.error = data;
                this.busy = false;
                return null;
            }
            else if(data.includes('OK')){
                this.error = "";
                // this.data = require('../../result.json');
                // this.parseDevices(this.data);
                this.busy = false;
            }
            if(data.includes('READY')){
                this.busy = false;
            }
        });
        this.command.stderr.on('data', (data) => {
            this.log(`child stderr:\n${data}`);
        });
        this.command.on('exit',()=>{
            this.log('Air conditioning controller crashed. Restarting ...');
            Klima.started = false;
            this.command.removeAllListeners();
            this.command = spawn('python3', [join(__dirname, 'klima.py'), 'listen']);
            this.initHandlers();
        });
    }

    async updateDevices(){
        if(Date.now() - this.lastRequest > 10000) {
            await this.makeRequest('list');
            this.parseDevices(require('../../result.json'));
        }
    }

    async getDevices(): Promise<Device[]> {

        return this.devices;
    }

    async setDevice(ac: AirConditioner, newStatus:any): Promise<AirConditioner> {
        // console.log(newStatus);
        let status = newStatus;
        // {
        //     isOn: newStatus.isOn == null ? ac.isOn : newStatus.isOn,
        //     targetTemp: newStatus.targetTemp == null ? ac.props.targetTemp : newStatus.targetTemp,
        //     mode: newStatus.mode == null ? ac.props.mode : newStatus.mode,
        //     fanSpeed: newStatus.fanSpeed == null ? ac.props.fanSpeed : newStatus.fanSpeed,
        //     swingMode: newStatus.swingMode == null ? ac.props.swingMode : newStatus.swingMode,
        //     eco: newStatus.eco == null ? ac.props.eco : newStatus.eco,
        //     turbo: newStatus.turbo == null ? ac.props.turbo : newStatus.turbo,
        // };
        const args = `change ${ac.id} ${parseBool(status.isOn)} ${status.targetTemp} ${parseMode(status.mode)} ${parseSwing(status.swingMode)} ${parseBool(status.eco)} ${parseBool(status.turbo)} ${parseFan(status.fanSpeed)}`;
        console.log(args);
        if(this.busy) throw 'Controller busy';
        if(!Klima.started) throw 'Controller isn\'t started yet';
        await this.makeRequest(args).catch((err)=> {this.findDeviceById(ac.id).online = false; });
        this.busy = false;
        newStatus.online = true;
        ac.update(newStatus);
        return ac;
    }

    async makeRequest(args: string) {
        return new Promise((resolve, reject) => {
            this.command.stdin.write(args + '\n', (error) => {
                if (error) reject(error);
            });
            this.busy = true;
            const handler = (data: string) => {
                if (data.includes('OK')) {
                    this.command.stdout.removeListener('data', handler);
                    resolve('ok');
                } else if (data.includes('ERR')) {
                    this.command.stdout.removeListener('data', handler);
                    reject(data);
                }
            };
            this.command.stdout.on('data', handler);
            this.lastRequest = Date.now();
        });
    }

    parseDevices(output){
        Object.keys(output).forEach(e=>{
            let data = output[e];
            let status = {
                isOn: data.isOn,
                targetTemp: data.targetTemp,
                outdoorTemp: data.outdoorTemp,
                indoorTemp: data.indoorTemp,
                mode: data.mode,
                fanSpeed: data.fanSpeed,
                swingMode: data.swingMode,
                eco: data.eco,
                turbo: data.turbo,
                online: true,
                timestamp: data.timestamp,
            };
            let device = this.findDeviceById(parseInt(e));
            if(device == undefined){
                this.devices.push(new AirConditioner(data.id, data.name, this, {},status));
            }
            else {
                let update = device.updatedAt;
                if (output[e].timestamp > update) {
                    this.findDeviceById(parseInt(e)).update(status);
                }
            }
            this.db.addDevice(this.findDeviceById(parseInt(e))).catch(err=>{
               this.db.updateDevice(this.findDeviceById(parseInt(e)));
            });
        });
    }
}

class AirConditioner extends Device{
    // mode: 0|1|2|3|4;
    // eco: boolean;
    // turbo: boolean;
    // targetTemp: number;
    // indoorTemp: number;
    // outdoorTemp: number;
    // fanSpeed: 0|1|2|3;
    // swingMode: 0|1|2|3;
    type = <deviceType>{
        name: "Klimatizacia",
        id: 3,
        icon: "ac_unit"
    }


    constructor(id, name, controller, options, props) {
        super(id, name, controller, options);
        this.update(props);
    }

    getStatus(): any {
        return this.toObject();
    }

    setStatus(newStatus: any): void {
        this.controller.setDevice(this, newStatus);
    }
    //
    // toObject(): any {
    //     this.getControls();
    //     return {
    //         id: this.id,
    //         name: this.name,
    //         isOn: this.isOn,
    //         props:{
    //             targetTemp: this.targetTemp,
    //             mode: this.mode,
    //             fanSpeed: this.fanSpeed,
    //             swingMode: this.swingMode,
    //             eco: this.eco,
    //             turbo: this.turbo,
    //         },
    //         type: 3,
    //         controlsHeight: this.controlsHeight,
    //         online: this.online,
    //         updated: this.updatedAt,
    //     }
    // }

    update(props: any): void {
        this.updatedAt = props.timestamp;
        this.props.turbo = props.turbo;
        this.props.eco = props.eco;
        this.props.mode = props.mode;
        this.isOn = props.isOn;
        this.readOnlyProps.indoorTemp = props.indoorTemp;
        this.readOnlyProps.outdoorTemp = props.outdoorTemp;
        this.props.targetTemp = props.targetTemp;
        this.props.swingMode = props.swingMode;
        this.props.fanSpeed = props.fanSpeed;
        this.online = props.online;
    }
    getControls() {
        super.getControls();
        return [
            this.NumberInput("targetTemp", "Target Temperature", 17, 30),
            this.Dropdown("fanSpeed", "Fan Speed", [
                <dropDownItem>{
                    name: "Low",
                    value: 0
                },
                <dropDownItem>{
                    name: "Medium",
                    value: 1
                },
                <dropDownItem>{
                    name: "High",
                    value: 2
                },
                <dropDownItem>{
                    name: "Silent",
                    value: 3
                }
            ]),
            this.Dropdown("mode", "operationalMode", [
                <dropDownItem>{
                    name: "Cool",
                    value: 0,
                    iconName: "ac_unit"
                },
                <dropDownItem>{
                    name: "Heat",
                    value: 1,
                    iconName: "wb_sunny"
                },
                <dropDownItem>{
                    name: "Dry",
                    value: 2,
                    iconName: "invert_colors_off"
                },
                <dropDownItem>{
                    name: "Fan only",
                    value: 3,
                    iconName: "loop"
                },
                <dropDownItem>{
                    name: "Auto",
                    value: 4,
                    iconName: "brightness_auto"
                }
            ]),
            this.Dropdown("swingMode", "Swing", [
                <dropDownItem>{
                    name: "None",
                    value: 0,
                },
                <dropDownItem>{
                    name: "Vertical",
                    value: 1,
                },
                <dropDownItem>{
                    name: "Horizontal",
                    value: 2,
                },
                <dropDownItem>{
                    name: "Both",
                    value: 3,
                }
            ]),
            this.Switch("eco", "ECO mode"),
            this.Switch("turbo", "Turbo mode")
        ];
    }
}

module .exports = Klima;