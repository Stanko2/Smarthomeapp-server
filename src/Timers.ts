import {Device} from "./Abstract/Device";
import {api} from './App';

const MAX_TRIES = 3;
const timers: Timer[] = [];
type timerData = {
    name: string,
    id: number,
    status: any,
    time:{
        hour: number,
        minute: number,
    },
    active: boolean,
    oneTime: boolean,
    loop: [boolean, boolean, boolean, boolean, boolean, boolean, boolean],
}


setTimeout(()=>loadTimers().then(()=>{
    setInterval(UpdateTimers,10000);
}), 500)

async function loadTimers(){
    let db = api.moduleController.database;
    let savedTimers = await db.listTimers();
    savedTimers.forEach(e=>timers.push(e));
}

export class Timer{
    public data: timerData;
    public wasRun: boolean;
    private device: Device;
    constructor(options: timerData){
        this.data = options;
        this.wasRun = false;
    }
    public async execute(){
        return new Promise((resolve, reject)=>{
            this.device.setStatus(this.data.status);
        });
    }
    public log(msg: string)
    {
        const date = new Date();
        console.log(`Timer ${this.data.name} ${date.getDate()}.${date.getMonth()}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}: ${msg}`)
    }
    public Change(newData: timerData){
        this.data = newData;
        api.moduleController.getDeviceById(this.data.status.id).then((device) => this.device = device);
    }
}

function UpdateTimers(){
    const date = new Date();
    const dayIndex = date.getDay() - 1 > 0 ? date.getDay() - 1 : 6;
    async function Run(timer: Timer) {
        for (let i = 0; i < MAX_TRIES; i++){
            try {
                await timer.execute().catch(reason => {
                    console.log(reason);
                    throw reason;
                }).then(r => timer.log(`ran successfully`));
            }
            catch (e) {
                timer.log(`ERROR: ${e} retrying call`);
                continue;
            }
            timer.wasRun = true;
            return;
        }
        if(timer.data.oneTime) DeleteTimer(timer.data.id);
        throw 'Maximum limit of tries exceeded. Ignoring timer ...';
    }

    timers.forEach((timer,index)=>{
        if(timer.wasRun && timer.data.oneTime) {
            DeleteTimer(timer.data.id);
            return;
        }
        if(timer.data.loop[dayIndex]){
            if(timer.data.time.hour == date.getHours() && timer.data.time.minute == date.getMinutes() && !timer.wasRun){
                Run(timer).catch(err=>{
                    timer.log(err);
                });
            }
            else{
                timer.wasRun = false;
            }
        }
    });
}


export function ListTimers(){
    return timers.map((e)=>e.data)
}

export function ChangeTimer(id: number, options: timerData){
    let t = timers.find((e)=> e.data.id === id);
    t.Change(options);
    api.moduleController.database.updateTimer(t);
}

export function DeleteTimer(id:number) {
    const index = timers.findIndex((e) => e.data.id === id);
    timers.splice(index, 1);
    api.moduleController.database.deleteTimer(id);
}

export function AddTimer(){
    const options: timerData = {
        name: "New timer",
        status: null,
        time:{
            hour: 10,
            minute: 0,
        },
        loop: [true,true,true,true,true,true,true],
        id: timers.length,
        oneTime: false,
        active: true,

    }
    timers.push(new Timer(options));
    api.moduleController.database.addTimer(timers[timers.length - 1]);
    return options;
}