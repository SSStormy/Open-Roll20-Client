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

interface FirebaseDataSnapshot<T> {
    val: () => T;
    key: () => string;
}

// TODO : import these from roll20.d.ts

interface ICharacterData {
    id: string;
}

interface IAttributeData {
    id: string;
}

class Attribute {
    private lowLevel: IAttributeData;
    private campaign: Campaign;

    constructor(rawData: IAttributeData, campaign: Campaign) {
        this.lowLevel = rawData;
        this.campaign = campaign;
    }

    public static async fromRaw(rawData: IAttributeData, campaign: Campaign) {
        return Promise.resolve(new Attribute(rawData, campaign));
    }


    public getCampaign() {
        return this.campaign;
    }
}

interface IFirebaseCollectionParams<THigh, TLow> {
    campaign: Campaign;
    url: string;
    factory : (a: TLow, b: Campaign) => Promise<THigh>;
}

class ReadyTracker {
    private readyTable: { [id: string]: boolean } = {};
    private wasReady: boolean = false;
    private readyEvent: FunctionPool<() => void> = new FunctionPool();

    public ready() {
        return this.readyEvent;
    }

    private tryFireReady() {
        for (const key in this.readyTable) {
            const isReady = this.readyTable[key];
            if (!isReady) return;
        }

        if (this.wasReady) return;
        this.wasReady = true;

        this.readyEvent.fireAll();
    }

    public registerCollection(coll: FirebaseCollection<any, any>) {
        const url: string = coll.getUrl();

        this.readyTable[url] = false;

        coll.ready().on(() => {
            this.readyTable[url] = true;
            this.tryFireReady();
        })
    }
}

class Character {

    private lowLevel: ICharacterData;
    private attribs: FirebaseCollection<Attribute, IAttributeData>;
    private readyTracker: ReadyTracker = new ReadyTracker();
    private campaign: Campaign;

    private constructor(rawData: ICharacterData, campaign: Campaign, onReady?: (c: Character) => void) {
        this.lowLevel = rawData;
        this.campaign = campaign;
    }

    public static async fromRaw(
        rawData: ICharacterData,
        campaign: Campaign) {

        const char = new Character(rawData, campaign);

        char.attribs = await FirebaseCollection.create({
            campaign,
            url: `/char-attribs/char/${rawData.id}/`,
            factory: Attribute.fromRaw
        });

        await new Promise((ok, err) => {
            char.attribs.ready().on(() => ok());
        });

        return char;
    }

    public getCampaign() {
        return this.campaign;
    }

    public getAttributes() {
        return this.attribs;
    }
}

class Campaign {
    public firebase: Firebase_T;
    private chat: Firebase_Child_T;
    private playerId: string;

    private characters: FirebaseCollection<Character, ICharacterData>;

    private readyTracker: ReadyTracker = new ReadyTracker();

    private constructor(campaignIdString: string, gntkn: string, playerId: string) {
        // @ts-ignore
        this.firebase = new Firebase(`https://roll20-9.firebaseio.com/${campaignIdString}/`);
        this.firebase.authWithCustomToken(gntkn);
        this.playerId = playerId;

        this.chat = this.firebase.child("/chat/");
    }

    public static async create(campaignIdString: string, gntkn: string, playerId: string) {
        const cmp = new Campaign(campaignIdString, gntkn, playerId);

        cmp.characters = await FirebaseCollection.create<Character, ICharacterData>({
            campaign: cmp,
            url: "/characters/",
            factory: Character.fromRaw
        });

        cmp.readyTracker.registerCollection(cmp.characters);

        return cmp;
    }

    public getFirebase() {
        return this.firebase;
    }

    public getCharacters() {
        return this.characters;
    }

    public ready() {
        return this.readyTracker.ready();
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
}

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

    public fireAll = (...args: any[]) => {
        for (const fx of this.fxList) {
            (<any>fx).apply(null, args);

        }
    }
}

class FirebaseCollectionEventPool<TLowLevel> {
    private parent: Firebase_Child_T;
    private eventName: string;

    private fxs: FunctionPool<(data: TLowLevel, key: string) => void> = new FunctionPool();

    constructor(eventName: string, parent: Firebase_Child_T) {
        this.parent = parent;
        this.eventName = eventName;
        this.parent.on(this.eventName, this.onGetData);
    }

    private onGetData = (rawData: FirebaseDataSnapshot<TLowLevel>) => {
        const data: TLowLevel = rawData.val();
        let key = null;

        if (typeof(rawData.key) === "function") {
            key = rawData.key();
        }

        if (!key) {
            key = (<any>data).id;
        }

        this.fxs.fireAll(data, key);
    };

    public on(callback: (data: TLowLevel, key: string) => void) {
        this.fxs.on(callback);
    }

    public off(callback: (data: TLowLevel, key: string) => void) {
        this.fxs.off(callback);
    }
}


class FirebaseCollection<THighLevel, TLowLevel> {

    private firebase: Firebase_Child_T;
    private campaign: Campaign;

    private firebaseValueEvent: FirebaseCollectionEventPool<{ [id: string]: TLowLevel }>;
    private firebaseAddedEvent: FirebaseCollectionEventPool<TLowLevel>;
    private firebaseChangedEvent: FirebaseCollectionEventPool<TLowLevel>;
    private firebaseRemovedEvent: FirebaseCollectionEventPool<TLowLevel>;

    private valueEvent: FunctionPool<(data: THighLevel) => void> = new FunctionPool();
    private addedEvent: FunctionPool<(data: THighLevel) => void> = new FunctionPool();
    private changedEvent: FunctionPool<(data: THighLevel) => void> = new FunctionPool();
    private removedEvent: FunctionPool<(key: string) => void> = new FunctionPool();
    private readyEvent: FunctionPool<(data: { [id: string]: THighLevel }) => void> = new FunctionPool();

    private byId: { [id: string]: THighLevel } = {};
    private highLevelFactory: (a: TLowLevel, b: Campaign) => Promise<THighLevel>;

    private url: string;

    private constructor(params: IFirebaseCollectionParams<THighLevel, TLowLevel>) {
        this.url = params.url;
        this.campaign = params.campaign;
        this.highLevelFactory = params.factory;
        this.firebase = this.campaign.getFirebase().child(this.url);

        this.firebaseValueEvent = new FirebaseCollectionEventPool("value", this.firebase);
        this.firebaseChangedEvent = new FirebaseCollectionEventPool("child_changed", this.firebase);
        this.firebaseRemovedEvent = new FirebaseCollectionEventPool("child_removed", this.firebase);
        this.firebaseAddedEvent = new FirebaseCollectionEventPool("child_added", this.firebase);
    }

    public static async create<THigh, TLow>(params: IFirebaseCollectionParams<THigh, TLow>) {
        const coll = new FirebaseCollection(params);

        coll.getInitialData().then(() => {
            coll.readyEvent.fireAll();
        });

        coll.firebaseValueEvent.on(coll.defaultOnValue);
        coll.firebaseAddedEvent.on(coll.defaultOnAdded);
        coll.firebaseChangedEvent.on(coll.defaultOnChanged);
        coll.firebaseRemovedEvent.on(coll.deafultOnRemoved);

        console.log(`created firebase collection ${coll.url}`);

        return coll;
    }

    private getInitialData(): Promise<null> {
        return new Promise((ok, err) => {
            const fx = async (data: { [id: string]: TLowLevel }) => {
                this.firebaseValueEvent.off(fx);

                await this.defaultOnValue(data);
                ok();
            };

            this.firebaseValueEvent.on(fx);
        })
    }

    public getUrl() {
        return this.url;
    }

    private async setValue(data: TLowLevel, key: string) {
        const high = await this.highLevelFactory(data, this.campaign);
        this.byId[key] = high;
        return high;

    }

    private defaultOnValue = async (data: { [id: string]: TLowLevel }) => {
        for (const key in data) {
            await this.setValue(data[key], key);
        }
    };

    private defaultOnAdded = (data: TLowLevel, key: string) => {
        if (this.byId[key]) return;

        // TODO : uncomment me this.setValue(data, key, this.added().fireAll);
    };

    private defaultOnChanged = (data: TLowLevel, key: string) => {
        const high = this.setValue(data, key);

        /*
            TODO : pass the before and after low level data to the changed event.
            This requires the highlevel structure to store the lowlevel one somewhere.
         */
        this.changed().fireAll(high);
    };

    private deafultOnRemoved = (data: TLowLevel, key: string) => {
        delete this.byId[key];
        this.removed().fireAll(key);
    };

    public getAll(): { [id: string]: THighLevel } {
        return this.byId;
    }

    public getById(id: string): THighLevel | null {
        return this.byId[id];
    }

    public ready() {
        return this.readyEvent;
    }

    public value() {
        return this.valueEvent
    };

    public added() {
        return this.addedEvent;
    };

    public changed() {
        return this.changedEvent;
    }

    public removed() {
        return this.removedEvent;
    }
}


const asyncCtx = async () => {

    const campaign = await Campaign.create(
        "campaign-3681941-o8feH7cdthipn745_0UaEA",
        <string>process.env.ROLL20_GNTKN,
        "-LMscFSR9rEZsn74c22H");


    campaign.ready().on(() => {
        console.log("ready.");
    });

    campaign.getCharacters().value().on((char: Character) => {
        console.log("character added");
        console.log(char.getAttributes().getAll());
    });
};

asyncCtx()
    .catch(console.error);
