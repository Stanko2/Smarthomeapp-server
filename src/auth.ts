import { v4 as uuid } from 'uuid';
import {db} from './Database';

export type User = {
    uid: string,
    isAdmin: boolean,
    granted: boolean,
    nickname: string,
}

export async function registerUser(nickName: string): Promise<User>{
    let user: User = {granted: false, isAdmin: false, nickname: nickName, uid: uuid()};
    user.isAdmin = (await db.users.find().count()) == 0;
    if(user.isAdmin) user.granted = true;
    await db.users.insertOne(user);
    return user;
}

export function grantPermission(senderUid, userUid, grant){
    db.users.updateOne({uid: userUid}, {$set: {granted: grant}});
}

export async function userExist(auth: string): Promise<boolean>{
    return (await db.users.find({uid:auth}).count()) > 0
}

export async function login(auth: string){
    return await db.users.findOne({uid: auth});
}

function alterUser(user){
    db.users.updateOne({uid: user.uid}, {$set: user});
}

export async function startUser(uid){
    let ret = {};
    ret['user'] = await getUserData(uid);
    if(await hasPermission(uid, true)){
        let otherUsers = [];
        await db.users.find({}).forEach(doc => {
            if(doc.uid != uid) otherUsers.push(doc);
        });
        ret['otherUsers'] = otherUsers;
    }
    return ret;
}

async function getUserData(uid){
    return await db.users.findOne({uid:uid})
}

export async function hasPermission(uid, admin = false) {
    let user = await getUserData(uid);
    if(user == null) return false;
    if(admin){
        return user.isAdmin;
    }
    else return user.granted;
}

export async function setNickname(uid, name){
    let user = await getUserData(uid);
    user.nickname = name;
    alterUser(user);
}