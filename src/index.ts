const dotenv = require("dotenv");
const fs = require("fs");

require("firebase");

{
    const cfg = dotenv.parse(fs.readFileSync(".env.gntkn"));
    for (const key in cfg) {
        process.env[key] = cfg[key];
    }
}

type Firebase_T = any;
type Firebase_Child_T = any;
type Firebase_Data_T = any;

// TODO : import these from roll20.d.ts

interface ICharacterData {

}

class Character {
    constructor(rawData: any) {

    }
}

class Campaign {
    public firebase: Firebase_T;
    private chat: Firebase_Child_T;
    private playerId: string;

    private characters: FirebaseCollection<ICharacterData>;

    private readyEvent: FunctionPool<() => void> = new FunctionPool();
    private readyTable: {[id: string] : boolean} = {};
    private hasReadyFired: boolean = false;

    public constructor(campaignIdString: string, gntkn: string, playerId: string) {
        // @ts-ignore
        this.firebase = new Firebase(`https://roll20-9.firebaseio.com/${campaignIdString}/`);
        this.firebase.authWithCustomToken(gntkn);
        this.playerId = playerId;

        this.chat = this.firebase.child("/chat/");

        this.characters = new FirebaseCollection("/characters/", this.createChild);

        this.addToReadyTable(this.characters, "characters");
    }

    public getCharacters(): FirebaseCollection<ICharacterData> {
        return this.characters;
    }

    private tryFireReady() {
        for(const key in this.readyTable) {
            const isReady = this.readyTable[key];
            if(!isReady) return;
        }

        if(this.hasReadyFired) return;
        this.hasReadyFired = true;

        this.readyEvent.fireAll();
    }

    private addToReadyTable<T>(collection: FirebaseCollection<T>, name: string) {
        this.readyTable[name] = false;
        collection.ready().on(() => {
            this.readyTable[name] = true;
            this.tryFireReady();
        })
    }

    public ready() {
        return this.readyEvent;
    }

    public say(content: string, who: string, type: string = "general") {
        const key = this.chat.push().key();
        // @ts-ignore
        const priority = Firebase.ServerValue.TIMESTAMP;
        this.chat.child(key).setWithPriority({
            content,
            playerid: this.playerId,
            who,
            type,
        }, priority);
    }

    public createChild = (url: string): Firebase_Child_T => {
        return this.firebase.child(url);
    }
}

type FirebaseChildFactory = (endpoint: string) => Firebase_Child_T;

class FunctionPool<T> {
    private fxList: T[];

    constructor() {
        this.fxList = [];
    }

    public on(fx: T) {
        this.fxList.push(fx);
    }

    public off(fx: T) {
        let idx = this.fxList.length;

        while (idx-- > 0) {
            let cur = this.fxList[idx];
            if (cur === fx) {
                this.fxList.splice(idx, 1);
            }
        }
    }

    public fireAll(...args: any[]) {
        for (const fx of this.fxList) {
            (<any>fx)(args);
        }
    }
}

class FirebaseCollectionEventPool<TData> {
    private parent: Firebase_Child_T;
    private eventName: string;

    private fxs: FunctionPool<(data: TData, key?: string) => void> = new FunctionPool();

    constructor(eventName: string, parent: FirebaseCollection<any>) {
        this.parent = parent.getFirebase();
        this.eventName = eventName;
        this.parent.on(this.eventName, this.onGetData);
    }

    private onGetData = (rawData: Firebase_Child_T) => {
        const data: TData = rawData.val();
        const key = rawData.key ? rawData.key() : null;

        this.fxs.fireAll(data, key);
    };

    public on(callback: (data: TData, key: string) => void) {
        this.fxs.on(callback);
    }

    public off(callback: (data: TData, key: string) => void) {
        this.fxs.off(callback);
    }
}


class FirebaseCollection<T> {

    private firebase: Firebase_Child_T;

    private valueEvent: FirebaseCollectionEventPool<{ [id: string]: T }>;
    private addedEvent: FirebaseCollectionEventPool<T>;
    private changedEvent: FirebaseCollectionEventPool<T>;
    private removedEvent: FirebaseCollectionEventPool<T>;
    private readyEvent: FunctionPool<(data: { [id: string]: T }) => void>;

    private byId: { [id: string]: T } = {};

    public constructor(url: string, factory: FirebaseChildFactory) {
        this.firebase = factory(url);

        this.valueEvent = new FirebaseCollectionEventPool("value", this);
        this.addedEvent = new FirebaseCollectionEventPool("child_added", this);
        this.changedEvent = new FirebaseCollectionEventPool("child_changed", this);
        this.removedEvent = new FirebaseCollectionEventPool("child_removed", this);
        this.readyEvent = new FunctionPool<(data: { [id: string]: T }) => void>();

        this.valueEvent.on(this.defaultOnValue);
        this.addedEvent.on(this.defaultOnAdded);
        this.changedEvent.on(this.defaultOnChanged);
        this.removedEvent.on(this.deafultOnRemoved);
    }

    private defaultOnValue = (data: { [id: string]: T }) => {
        this.byId = data;
        this.readyEvent.fireAll();
    };

    private defaultOnAdded = (data: T, key: string) => {
        this.byId[key] = data;
    };

    private defaultOnChanged = (data: T, key: string)  =>{
        this.byId[key] = data;
    };

    private deafultOnRemoved = (data: T, key: string) => {
        delete this.byId[key];
    };

    public getAll(): { [id: string]: T } {
        return this.byId;
    }

    public getById(id: string): T | null {
        return this.byId[id];
    }

    public getFirebase(): Firebase_Child_T {
        return this.firebase
    };

    public ready(): FunctionPool<(data: { [id: string]: T }) => void> {
        return this.readyEvent;
    }

    public value(): FirebaseCollectionEventPool<{ [id: string]: T }> {
        return this.valueEvent
    };

    public added(): FirebaseCollectionEventPool<T> {
        return this.addedEvent
    };

    public changed(): FirebaseCollectionEventPool<T> {
        return this.changedEvent
    };

    public removed(): FirebaseCollectionEventPool<T> {
        return this.removedEvent
    };
}

const campaign = new Campaign(
    "campaign-3681941-o8feH7cdthipn745_0UaEA",
    <string>process.env.ROLL20_GNTKN,
    "-LMscFSR9rEZsn74c22H");


campaign.ready().on(() => {
    console.log("ready.");
    console.log(campaign.getCharacters().getAll());
});