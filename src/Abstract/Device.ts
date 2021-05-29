import {Module} from "./Module";
import Color = require("color");

export type deviceType = {
    name: string,
    icon: string,
    id: number,
}

export type dropDownItem = {
    name: string,
    iconName: string,
    value: any
}

export abstract class Device{
    id: number;
    name: string;
    options: any;
    online: boolean;
    updatedAt: number;
    controller: Module;
    controlsHeight:number;
    props: any;
    readOnlyProps: any;
    isOn: boolean;
    public type: deviceType;

    protected constructor(id: number, Name: string, controller: Module, options: any)
    {
        this.id = id;
        this.name = Name;
        this.options = options;
        this.controller = controller;
        this.props = {};
        this.readOnlyProps = {};
    }

    public getStatus(): any{
        return this.props;
    };

    public setStatus(newStatus: any): void{
        this.controller.setDeviceRequest(this, newStatus);
    }

    public abstract update(props: any): void;

    public toObject(): any{
        this.getControls();
        return {
            id: this.id,
            name: this.name,
            isOn: this.isOn,
            online: this.online,
            updated: this.updatedAt,
            props: this.props,
            readOnlyProps: this.readOnlyProps,
            type: this.type.id,
            controlsHeight: this.controlsHeight,
        }
    }

    public getControls(){ this.controlsHeight = 0};

    protected NumberInput(propertyName: string, label: string, min: number, max: number){
        this.controlsHeight += 58;
        return {
            type: "Number",
            min: min,
            max: max,
            label: label,
            property: propertyName,
            default: max,
        }
    }
    protected Slider(propertyName: string, label: string, min: number, max: number){
        this.controlsHeight += 58;
        return {
            type: "Range",
            min: min,
            max: max,
            label: label,
            property: propertyName,
            default: max,
        }
    }
    protected Dropdown(propertyName: string, label: string, options: dropDownItem[]){
        this.controlsHeight += 58;
        return {
            type: "Option",
            label: label,
            property: propertyName,
            items: options,
            default: options[0].value,
        };
    }
    protected Switch(propertyName: string, label: string){
        this.controlsHeight += 58;
        return {
            type: "Switch",
            label: label,
            property: propertyName,
            default: true,
        }
    }

    protected Button(event: string, label: string, options: ButtonOptions = {buttonLabel: null, color: null, icon: null}){
        this.controlsHeight += 58;
        return {
            type: "Button",
            label: label,
            color: options.color == null ? null : options.color.object(),
            buttonLabel: options.buttonLabel,
            icon: options.icon,
            event: event,
        }
    }
    protected ColorPicker(property: string, label: string){
        this.controlsHeight += 70;
        return {
            type: "Color",
            label: label,
            property: property,
            default: {r:255, g:255, b:255},
        }
    }
}

export type ButtonOptions = {
    buttonLabel: string,
    icon: string,
    color: Color,
}