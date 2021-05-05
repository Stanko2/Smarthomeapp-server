import {Module} from "../../Abstract/Module";
import {Device, deviceType, dropDownItem} from "../../Abstract/Device";
import Color = require('color');

class TestModule extends Module{

    async initialize(args: any) {
        this.devices = [];
        this.devices.push(new CustomDevice(1, "Zariadenie", this, {}));
        this.event.on("Test", (id)=>{
            this.log(`${id} called Test`);
        })
    }

    async getDevices(): Promise<Device[]> {
        return Promise.resolve(this.devices);
    }

    async setDevice(device: Device, newStatus: any): Promise<Device> {
        device.update(newStatus);
        return Promise.resolve(device);
    }

}

class CustomDevice extends Device{
    range: number = 4;
    number: number = 5;
    switch: boolean = true;
    dropdown: string = "option 1";
    color: Color;
    type = <deviceType>{
        icon: 'accessibility',
        id: 2,
        name: 'Test Type'
    }

    constructor(id: number, name: string, controller: Module, options: any) {
        super(id, name, controller, options);
        this.online = true;
        this.isOn = true;
        this.color = Color({r: 255, g: 255, b: 255});
    }



    getStatus(): any {
    }

    setStatus(newStatus: any): void {
        this.controller.setDevice(this, newStatus);
    }

    // toObject(): any {
    //     this.getControls();
    //     return {
    //         id: this.id,
    //         isOn: this.isOn,
    //         name: this.name,
    //         updated: this.updatedAt,
    //         props: {
    //             range: this.range,
    //             switch: this.switch,
    //             number: this.number,
    //             dropdown: this.dropdown,
    //             color: {
    //                 r: this.color.red(),
    //                 g: this.color.green(),
    //                 b: this.color.blue()
    //             }
    //         },
    //         type: 2,
    //         online: this.online,
    //         controlsHeight: this.controlsHeight,
    //     }
    // }

    update(props: any): void {
        this.number = props.number;
        this.switch = props.switch;
        this.range = props.range;
        this.dropdown = props.dropdown;
        this.isOn = props.isOn;
        this.color = Color.rgb(props.color.r, props.color.g, props.color.b);
    }

    getControls() {
        super.getControls();
        return [
            this.Slider("range","Test Slider",0,10),
            this.NumberInput("number", "test number",0,10 ),
            this.Switch("switch", "test Switch"),
            this.Dropdown("dropdown", "test dropdown", [
                <dropDownItem>{
                    name: "option 1"
                },
                <dropDownItem>{
                    name: "option 2"
                },
                <dropDownItem>{
                    name: "option 3"
                }
            ]),
            this.ColorPicker("color", "Test ColorPicker"),
            this.Button("Test", "Test Button"),
        ];
    }
}

module .exports = TestModule;