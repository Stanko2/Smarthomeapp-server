import {Collection, Db, MongoClient} from "mongodb";
import {Device} from "./Abstract/Device";
import {Timer} from "./Timers";

class Database{
    client: MongoClient;
    db: Db;
    devices: Collection;
    timers: Collection;
    users: Collection;
    groups:Collection;
    constructor() {
        const CONNECT_TIMEOUT = 2000
        this.client = new MongoClient(require('./Config.json').databaseUrl, {useUnifiedTopology: true});
        this.client.connect().then((client)=>{
            this.client = client;
            this.db = client.db("smartHomeApp");
            this.db.collection("Devices",(err,collection)=>{
                if(err) throw err;
                this.devices = collection;
            });
            this.db.collection("Timers",(err,collection)=>{
                if(err) throw err;
                this.timers = collection;
            });
            this.db.collection("Users", (err,collection)=>{
                if(err) throw err;
                this.users = collection;
            });
            this.db.collection("Groups", (err,collection)=>{
                if(err) throw err;
                this.groups = collection;
            });
        }).catch(err=>console.log(err));
        setTimeout(() => {
            if(!this.client.isConnected()){
                console.log('Database connect timeout exceeded. Make sure your databse is up and running and your url is set up correctly');
                process.exit(3)
            }
        }, CONNECT_TIMEOUT);
    }

    async addDevice(device: Device){
        return new Promise<void>((resolve, reject) => {
            this.devices.findOne({id: device.id}, (err,value)=>{
                if(err) reject(err);
                if(value == undefined){
                    let data = device.toObject();
                    data.type = device.type;
                    this.devices.insertOne(data).then(() => resolve()).catch(err => reject(err));
                }
                else reject('Device already Exists');
            });

        });
    }

    async updateDevice(device: Device){
        return new Promise<void>((resolve, reject) => {
            if(!this.client.isConnected()){
                console.log('Database connect timeout exceeded. Make sure your databse is up and running and your url is set up correctly');
                process.exit(3)
            }
            let data = device.toObject();
            data.type = device.type;
            this.devices.updateOne({id: device.id}, {$setOnInsert: data}, {upsert:true}).then(()=>resolve()).catch(err=>reject(err));
        });
    }

    async addTimer(timer: Timer){
        return new Promise<void>((resolve, reject) => {
            this.timers.findOne({id: timer.data.id}, (err,value)=>{
                if(err) reject(err);
                if(value == undefined){
                    this.timers.insertOne(timer.data).then(() => resolve()).catch(err => reject(err));
                }
                else reject('Timer already Exists');
            });

        });
    }

    async updateTimer(timer: Timer){
        return new Promise<void>((resolve, reject) => {
            this.timers.updateOne({id: timer.data.id}, {$set: timer.data}).then(()=>resolve()).catch(err=>reject(err));
        });
    }

    listTimers(): Promise<Timer[]>{
        return new Promise(resolve => {
            let out: Timer[] = [];
            if(!this.client.isConnected()){
                console.log('Database connect timeout exceeded. Make sure your databse is up and running and your url is set up correctly');
                process.exit(3)
            }
            this.timers.find().forEach((e)=>{
                out.push(new Timer(e));
            }).then(()=>{resolve(out);});
        })
    }

    async deleteTimer(id:number){
        this.timers.deleteOne({id:id}, (err, value)=>{
            if (err) throw err;
        });
    }



    destroy(){
        this.client.close();
    }
}

export const db = new Database();
