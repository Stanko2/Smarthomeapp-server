import {ModuleLoader} from "./ModuleLoader";
import bodyparser = require('body-parser');
import * as cors from 'cors';
import * as express from 'express';
import * as Timer from "./Timers";
import {grantPermission, hasPermission, login, registerUser, setNickname, startUser, User, userExist} from "./auth";
import {Application, Router} from "express";
import {GroupManager} from "./GroupManager";

const localIpRegex = '(^127\\.)|\n' +
    '(^10\\.)|\n' +
    '(^172\\.1[6-9]\\.)|(^172\\.2[0-9]\\.)|(^172\\.3[0-1]\\.)|\n' +
    '(^192\\.168\\.)'

class App{
    app: Application;
    moduleController: ModuleLoader;
    groups: GroupManager;
    mainHandler: Router;
    enableAuth: boolean
    constructor() {
        let config = require('./Config.json');
        this.enableAuth = config.enableAuth || false;
        this.app = express();
        this.mainHandler = Router();
        this.app.use(cors());
        this.app.options('*', cors());
        this.app.use(bodyparser.json());
        this.moduleController = new ModuleLoader();
        this.initializeAuth();
        this.registerHandlers();
        this.groups = new GroupManager();
        this.app.use('/api', this.mainHandler);
        this.mainHandler.use('/groups', this.groups.router);
        this.app.listen(config.Port, config.Address, ()=>{
            console.log("app listening");
        });
    }

    initializeAuth():void{
        this.app.post('/login', (async (req, res) => {
            if(!this.enableAuth) res.send({
                status:'OK',
                user: {granted: true, isAdmin: true, nickname: 'anonymous', uid: 'exampleID'},
            });
            else if(await userExist(req.body.uid)) res.send({
                status: 'OK',
                user: await login(req.body.uid)
            });
            else res.send({status: 'ERR', message: 'user does not exist'});
        }));
        this.app.post('/register', async (req,res)=>{
            if(req.body.name == '' || req.body.name == undefined){
                res.send({status: 'ERR', message: 'name not provided'});
                res.statusCode = 403;
                res.end();
                return;
            }
            let user = await registerUser(req.body.name);
            res.setHeader('authorization', user.uid);
            res.send({status:'OK', user: user});
        });
        this.app.get('/user', async (req, res) => {
            res.send(await startUser(req.headers["authorization"]));
        });
        this.app.post('/changeName', async (req,res)=>{
            await setNickname(req.headers["authorization"], req.body.nickname);
            res.send({status: 'OK'});
        });
        this.app.post('/acceptPermission', async (req, res) => {
            if(await hasPermission(req.headers["authorization"], true)){
                await grantPermission(req.headers["authorization"], req.body.user, req.body.hasPermission);
                res.send({status: 'OK'});
            }
            else{
                res.send({status: 'ERR', message: 'permission-denied'});
                res.statusCode = 403;
                res.end();
                return;
            }
        })
        this.mainHandler.all('*', async (req, res, next) => {
           if(!this.enableAuth){
               next();
               return;
           }
            if(await hasPermission(req.headers["authorization"])){
               next();
           }
           else{
               res.statusCode = 403;
               res.send({status: 'ERR', message: "permission-denied"});
               res.end();
           }
        });
    }

    registerHandlers(): void{
        this.mainHandler.get('/devices', async (req,res) => await this.listDevices(req,res));
        this.mainHandler.get('/devices/:id', (req,res) => this.getDevice(req,res));
        this.mainHandler.post('/change', (req,res) => this.changeDevice(req,res));
        this.mainHandler.post('/change/:event', (req, res) => {
            this.moduleController.findModuleForDevice(req.body.id).then((module)=>{
                 module.fireEvent(req.params.event, req.body.id);
            });
        });
        this.mainHandler.get('/timers', (req,res)=>{
            res.send(Timer.ListTimers());
        });

        this.mainHandler.post('/addTimer', (req,res)=>{
            res.send(Timer.AddTimer())
        });

        this.mainHandler.post('/timerChange', (req,res)=>{
            try{
                Timer.ChangeTimer(req.body.id, req.body);
                res.send({status: 'OK'})
            }
            catch(e){
                console.log(e);
                res.send({status:'ERR', message: e})
            }
        });

        this.mainHandler.post('/removeTimer', (req,res)=>{
            Timer.DeleteTimer(req.body.id);
            res.send({status: 'OK'})
        });

        this.mainHandler.get('/devices/:id/controls', async (req,res) => await this.getControls(req.params.id, res));
    }

    private getControls(deviceId, res){
        this.moduleController.getDeviceById(parseInt(deviceId)).then((controller)=>{
            let mainControls = controller.getControls();
            res.send({
                typeInfo: controller.type,
                headerControls: undefined,
                mainControls: mainControls,
            });
        });
    }

    private changeDevice (req,res){
        this.moduleController.findModuleForDevice(req.body.id).then((controller)=>{
            let newStatus = req.body.props;
            newStatus.isOn = req.body.isOn;
            controller.setDeviceRequest(controller.findDeviceById(req.body.id), newStatus).then((newStatus)=>{
                res.send({status: 'OK', newStatus: newStatus});
            }).catch((err)=>res.send(err));
        });
    }

    private async listDevices (req, res){
        let devices: any[] = await this.moduleController.listDevices();
        res.send({
            deviceCount: devices.length,
            devices: devices,
        });
    }

    private getDevice (req,res){
        let id = parseInt(req.params.id);
        this.moduleController.findModuleForDevice(id).then((module)=> {
            let device = module.findDeviceById(id);
            res.send(device.toObject());
        }).catch((err)=> res.send("Device does not exist or is unavailable"));
    }
}

export var api = new App();

module.exports = api;