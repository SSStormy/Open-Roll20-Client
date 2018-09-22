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

interface IFirebaseCollectionParams<THigh, TLow> {
    campaign: Campaign;
    url: string;
    factory: (a: TLow, b: Campaign) => Promise<THigh>;
}

abstract class HighLevelObject<TLow> {
    private lowLevel: TLow;
    private previousLowLevel: TLow | null = null;
    private campaign: Campaign;

    constructor(lowLevel: TLow, campaign: Campaign) {
        this.lowLevel = lowLevel;
        this.campaign = campaign;
    }

    protected abstract internalUpdateLowLevelData(newLow: TLow): void;

    public updateLowLevelData(newLow: TLow) {

        this.internalUpdateLowLevelData(newLow);

        this.previousLowLevel = this.lowLevel;
        this.lowLevel = newLow;
    }

    public getCampaign() {
        return this.campaign
    }

    public getLowLevel() {
        return this.lowLevel;
    }

    public getPreviousLowLevel(): TLow | null {
        return this.previousLowLevel;
    }
}


interface IAttributeData {
    id: string;
    name: string;
    current: string;
    max: string;
}

class Attribute extends HighLevelObject<IAttributeData> {

    constructor(rawData: IAttributeData, campaign: Campaign) {
        super(rawData, campaign);
    }

    public static async fromRaw(rawData: IAttributeData, campaign: Campaign) {
        return new Attribute(rawData, campaign);
    }

    protected internalUpdateLowLevelData(newLow: IAttributeData): void {
        // TODO
    }
}


class Character extends HighLevelObject<ICharacterData> {

    private attribs: FirebaseCollection<Attribute, IAttributeData>;

    private constructor(rawData: ICharacterData, campaign: Campaign) {
        super(rawData, campaign);
    }

    protected internalUpdateLowLevelData(newLow: ICharacterData): void {
        // TODO
    }

    public static async fromRaw(
        rawData: ICharacterData,
        campaign: Campaign) {

        const char = new Character(rawData, campaign);

        char.attribs = new FirebaseCollection({
            campaign,
            url: `/char-attribs/char/${rawData.id}/`,
            factory: Attribute.fromRaw
        });

        await char.attribs.getReadyPromise();

        return char;
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

    private readyEvent: FunctionPool<() => void> = new FunctionPool();

    private constructor(campaignIdString: string, gntkn: string, playerId: string) {
        // @ts-ignore
        this.firebase = new Firebase(`https://roll20-9.firebaseio.com/${campaignIdString}/`);
        this.firebase.authWithCustomToken(gntkn);
        this.playerId = playerId;

        this.chat = this.firebase.child("/chat/");
    }

    public static create(campaignIdString: string, gntkn: string, playerId: string) {
        const cmp = new Campaign(campaignIdString, gntkn, playerId);

        cmp.characters = new FirebaseCollection<Character, ICharacterData>({
            campaign: cmp,
            url: "/characters/",
            factory: Character.fromRaw
        });

        Promise.all([cmp.characters.getReadyPromise()])
            .then(() => {
                cmp.readyEvent.fireAll();
            });

        return cmp;
    }

    public getFirebase() {
        return this.firebase;
    }

    public getCharacters() {
        return this.characters;
    }

    public ready() {
        return this.readyEvent;
    }

    public say(content: string, who: string = "not a bot", type: string = "general") {
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

class FirebaseCollection<THighLevel extends HighLevelObject<TLowLevel>, TLowLevel> {
    private firebase: Firebase_Child_T;
    private campaign: Campaign;

    private addedEvent: FunctionPool<(data: THighLevel) => Promise<void>> = new FunctionPool();
    private changedEvent: FunctionPool<(data: THighLevel) => Promise<void>> = new FunctionPool();
    private removedEvent: FunctionPool<(data: THighLevel) => Promise<void>> = new FunctionPool();
    private readyEvent: FunctionPool<(data: { [id: string]: THighLevel }) => Promise<void>> = new FunctionPool();

    private byId: { [id: string]: THighLevel } = {};
    private idToIndex: { [id: string]: number } = {};
    private all: THighLevel[] = [];

    private highLevelFactory: (a: TLowLevel, b: Campaign) => Promise<THighLevel>;

    private url: string;
    private isReady: boolean = false;

    private readyPromise: Promise<void>;

    public constructor(params: IFirebaseCollectionParams<THighLevel, TLowLevel>) {
        this.url = params.url;
        this.campaign = params.campaign;
        this.highLevelFactory = params.factory;
        this.firebase = this.campaign.getFirebase().child(this.url);

        this.readyPromise = new Promise(ok => this.ready().on(async () => {
            console.log(`================${this.url} IS READY WITH ${this.all.length} ELEMENTS`);
            ok();
        }));

        this.firebase.once("value", this.defaultOnValue);

        console.log(`created firebase collection ${this.url}`);
    }

    private defaultOnValue = async (firebaseData: any) => {
        console.log('value');
        const data: { [id: string]: TLowLevel } = firebaseData.val();

        for (const key in data) {
            if (this.doesKeyExist(key)) continue;

            const low = data[key];

            await this.internalAddOrChange(low, key);
            console.log(`${key} value`);
        }

        if (!this.isReady) {
            this.isReady = true;

            this.firebase.on("child_added", this.defaultOnAdded);
            this.firebase.on("child_changed", this.defaultOnChanged);
            this.firebase.on("child_removed", this.defaultOnRemoved);

            this.readyEvent.fireAll();
        }
    };

    private defaultOnAdded = async (firebaseData: any) => {
        if (!this.isReady) return;

        const data = firebaseData.val();
        const key = firebaseData.key();

        if (this.doesKeyExist(key)) return;

        const high = await this.internalAddOrChange(data, key);

        if (!high) {
            return;
        }

        console.log(`${key} added`);
        this.addedEvent.fireAll(high);
    };

    private defaultOnChanged = async (firebaseData: any) => {
        if (!this.isReady) return;

        const data = firebaseData.val();
        const key = firebaseData.key();

        if (!this.doesKeyExist(key)) {
            return;
        }

        const high = this.internalChange(data, key);
        this.changed().fireAll(high);
    };

    private defaultOnRemoved = async (firebaseData: any) => {
        if (!this.isReady) return;

        const key = firebaseData.key();

        const high = this.internalDelete(key);
        this.removed().fireAll(high);
    };

    public getAllAsArray() {
        return this.all;
    }

    public getUrl() {
        return this.url;
    }

    private async internalAddOrChange(data: TLowLevel, key: string): Promise<THighLevel | null> {
        return this.doesKeyExist(key)
            ? this.internalChange(data, key)
            : await this.internalAdd(data, key);
    }

    private async internalAdd(data: TLowLevel, key: string): Promise<THighLevel> {
        const high = await this.highLevelFactory(data, this.campaign);
        this.idToIndex[key] = this.all.length;
        this.all.push(high);
        this.byId[key] = high;
        return high;
    }

    private internalChange(data: TLowLevel, key: string): THighLevel | null {
        const existing = this.getById(key);
        if (!existing) return null;

        existing.updateLowLevelData(data);
        return existing;
    }

    private doesKeyExist(key: string): boolean {
        return this.getById(key) !== undefined;
    }

    private internalDelete(key: string): THighLevel {
        {
            const idx = this.idToIndex[key];
            if (typeof(idx) === "number") {
                this.all.splice(idx, 1);
            }
        }

        const data = this.byId[key];

        delete this.byId[key];
        delete this.idToIndex[key];

        return data;
    }

    public getReadyPromise() {
        return this.readyPromise;
    }

    public getAllAsTable(): { [id: string]: THighLevel } {
        return this.byId;
    }

    public getById(id: string): THighLevel | null {
        return this.byId[id];
    }

    public ready() {
        return this.readyEvent;
    }

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

    const campaign = Campaign.create(
        "campaign-3681941-o8feH7cdthipn745_0UaEA",
        <string>process.env.ROLL20_GNTKN,
        "-LMscFSR9rEZsn74c22H");

    campaign.ready().on(() => {
        console.log("ready.");
    });

    campaign.getCharacters().added().on(async (char: Character) => {
        campaign.say("new character added watcing for attribute changes.");
        const attribs = char.getAttributes();

        attribs.added().on(async (attrib: Attribute) => {
            console.log(`added attrib ${attrib.getLowLevel().name}`);
        });

        attribs.removed().on(async (attrib: Attribute) => {
            console.log(`removed attrib ${attrib.getLowLevel().name}`);
        });

        attribs.changed().on(async (attrib: Attribute) => {
            console.log(`changed attrib ${attrib.getLowLevel().name}`);
        });
    });

    campaign.getCharacters().changed().on(async (char: Character) => {
        campaign.say("character changed.");

    });

    campaign.getCharacters().removed().on(async (char: Character) => {
        campaign.say("character removed.");
    });
};

asyncCtx().catch(console.error);
