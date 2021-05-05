import {Router} from 'express'
import {DeviceGroup} from "./DeviceGroup";
import {api} from "./App";
import {Cursor} from "mongodb";
import {db} from './Database';

export class GroupManager {
    groups: DeviceGroup[];
    router: Router;

    constructor() {
        this.router = Router();
        this.initHandlers();
        setTimeout(()=>{
            this.loadGroups().then(grp=>{
                this.groups = grp;
            });
        }, 200);
    }

    async loadGroups(): Promise<DeviceGroup[]>{
        return new Promise(async (resolve, reject )=> {
            let out: DeviceGroup[] = [];
            if(!db.client.isConnected()){
                console.log('Database connect timeout exceeded. Make sure your databse is up and running and your url is set up correctly');
                process.exit(3)
            }
            let groups: Cursor = await db.groups.find();
            while(await groups.hasNext()){
                let group = await groups.next();
                let devices = [];
                console.log(group);
                for (const f of group.devices) {
                    let d = await db.devices.findOne({id: f});
                    devices.push(d);
                }
                let grp = new DeviceGroup(group.name, group.id, devices);
                out.push(grp);
            }
            resolve(out);
        })
    }
    initHandlers(){
        this.router.post('/Add', async (req, res) => {
            let devices = [];
            for (const f of req.body.devices) {
                let dev = await api.moduleController.getDeviceById(f);
                devices.push(dev);
            }
            let grp = new DeviceGroup(req.body.name, this.groups.length, devices);
            this.groups.push(grp);
            await db.groups.insertOne(grp.getSaveJson());
            res.send({status:'ok', id: this.groups[this.groups.length-1].id});
        });
        this.router.get('/', async (req, res) => {
            let data = [];
            for (const e of this.groups) {
                data.push({
                    name: e.name,
                    id: e.id,
                    types: await e.getControls(),
                    devices: e.devices.map(f=>f.id),
                });
            }
            res.send(data);
        });
        this.router.post('/change', async (req, res) => {
            let grp = this.groups.find(e=>e.id == req.body.id);
            grp.name = req.body.name;
            grp.devices = req.body.devices;
            grp.updateTypes();
            await db.groups.updateOne({id: req.body.id}, { $set: grp.getSaveJson()});
            res.send({status:'ok'});
        });
        this.router.get('/:id/:typeId', async (req, res) => {
            let grp = this.groups.find(e=>e.id == parseInt(req.params.id));
            res.send(await grp.getStatus(parseInt(req.params.typeId)));
        });
        this.router.get('/:id/:typeId/controls', async (req, res) => {
            let grp = this.groups.find(e=>e.id == parseInt(req.params.id));
            res.send(await grp.getDeviceControls(parseInt(req.params.typeId)));
        });
        this.router.post('/:id/:typeId', async (req, res) => {
            let grp = this.groups.find(e=>e.id == parseInt(req.params.id));
            await grp.toggle(parseInt(req.params.typeId));
            res.send({status: 'ok'});
        });
    }
}