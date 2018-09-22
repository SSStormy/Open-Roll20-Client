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

// TODO : import these from roll20.d.ts

abstract class HighLevelObject<TLow> {
    private lowLevel: TLow;
    private previousLowLevel: TLow | null = null;
    private campaign: Campaign;
    private firebase: Firebase_Child_T;

    public constructor(lowLevel: TLow, campaign: Campaign, fb: Firebase_Child_T) {
        this.campaign = campaign;
        this.firebase = fb;

        this.updateLowLevelData(lowLevel);
    }

    public getFirebase() {
        return this.firebase;
    }

    protected setNewLowLevel(newLow: TLow) {
        this.previousLowLevel = this.lowLevel;
        this.lowLevel = newLow;
    }

    public abstract updateLowLevelData(newLow: TLow): void;

    public getCampaign() {
        return this.campaign
    }

    public getLowLevel() {
        return this.lowLevel;
    }

    public getPreviousLowLevel(): TLow | null {
        return this.previousLowLevel;
    }

    public getArbitrary(varName: string): any {
        return (<any>this.getLowLevel())[varName];
    }

    public setArbitrary(varName: string, data: any) {
        this.getFirebase().child(varName).set(data);
    }
}


interface IAttributeData {
    id?: string;
    name?: string;
    current?: string;
    max?: string;
}

class Attribute extends HighLevelObject<IAttributeData> {
    public static async fromRaw(rawData: IAttributeData, campaign: Campaign, fb: Firebase_Child_T) {
        return new Attribute(rawData, campaign, fb);
    }

    public updateLowLevelData(newLow: IAttributeData): void {
        this.setNewLowLevel(newLow);
    }
}

interface IMacroData {
    action: string;
    id: string;
    istokenaction: boolean;
    name: string;
    visibleto: string; //comma separated ids
}

const commaSeparatedToArray = <T extends HighLevelObject<TLow>, TLow>(container: FirebaseCollection<T, TLow>, commaSeparated: string): T[] => {
    const ids = commaSeparated.split(',');
    const retval = [];

    for (const id of ids) {

        const obj = container.getById(id);
        if (obj) {
            retval.push(obj);
        }

    }
    return retval;
};

class Macro extends HighLevelObject<IMacroData> {

    private visibleTo: Player[] | null = null;

    public updateLowLevelData(newLow: IMacroData): void {
        this.setNewLowLevel(newLow);
    }

    public static async fromRaw(
        rawData: IMacroData,
        campaign: Campaign,
        fb: Firebase_Child_T) {

        return new Macro(rawData, campaign, fb);
    }

    public getAction() {
        return this.getLowLevel().action;
    }

    public isTokenAction() {
        return this.getLowLevel().istokenaction;
    }

    public getName() {
        return this.getLowLevel().name;
    }

    public getVisibleTo(): Player[] {
        if (!this.visibleTo) {
            this.visibleTo = commaSeparatedToArray(this.getCampaign().getPlayers(), this.getLowLevel().visibleto);
        }

        return this.visibleTo;
    }
}

interface IPlayerData {
    id?: string;
    color?: string;
    d20userid?: string;
    d20username?: string;
    displayname?: string;
    online?: boolean;
    speakingas?: string;
    advShortcuts?: boolean;
    // @NO-API
    adv_fow_revealed?: string; // @NO-API
    alphatokenactions?: boolean; // @NO-API
    apptddiceenabled?: boolean; // @NO-API
    bigsearchstyle?: boolean; // @NO-API
    chatavatarsenabled?: boolean; // @NO-API
    chatbeepenabled?: boolean; // @NO-API
    chattimestampsenabled?: boolean; // @NO-API
    diceiconsenabled?: boolean; // @NO-API
    disableagency?: boolean; // @NO-API
    globalvolume?: number; // @NO-API
    journalfolderstatus?: string; // @NO-API
    jukeboxfolderstatus?: string; // @NO-API
    lastActive?: number; // @NO-API
    lastpage?: string; // @NO-API
    librarytab?: string; // @NO-API
    macrobar?: string; // @NO-API
    recentuploadsfilter?: boolean; // @NO-API
    showmacrobar?: boolean; // @NO-API
    tddiceenabled?: boolean; // @NO-API
    usePopouts?: boolean; // @NO-API
    videobroadcasttype?: string; // @NO-API
    videoplayerlocation?: string; // @NO-API
    videoplayersize?: string; // @NO-API
    videoreceivetype?: string; // @NO-API
}

class Player extends HighLevelObject<IPlayerData> {
    private macros: FirebaseCollection<Macro, IMacroData>;

    public updateLowLevelData(newLow: IPlayerData): void {
        this.setNewLowLevel(newLow);
    }

    public static async fromRaw(
        rawData: IPlayerData,
        campaign: Campaign,
        fb: Firebase_Child_T) {

        const player = new Player(rawData, campaign, fb);

        player.macros = new FirebaseCollection(
            campaign,
            `/macros/player/${rawData.id}/`,
            Macro.fromRaw
        );

        await player.macros.getReadyPromise();

        return player;
    }

    public getColor(): string {
        return this.getLowLevel().color || "";
    }

    public getUserId(): string {
        return this.getLowLevel().d20userid || ""
    }

    public getUsername(): string {
        return this.getLowLevel().d20username || "";
    }

    public getDisplayName(): string {
        return this.getLowLevel().displayname || "";
    }

    public isOnline(): boolean {
        return this.getLowLevel().online || false;
    }

    public getSpeakingAs(): string {
        return this.getLowLevel().speakingas || "";
    }
}

interface ICharacterAbilityData {

}

class CharacterAbility extends HighLevelObject<ICharacterAbilityData> {
    public updateLowLevelData(newLow: ICharacterAbilityData): void {
        this.setNewLowLevel(newLow);
    }
}

interface ICharacterData {
    name?: string;
    avatar?: string;
    tags?: string;
    controlledby?: string;
    inplayerjournals?: string;
    defaulttoken?: number | string; // string if null, and the number value is a unix timestamp
    id?: string;
    bio?: string | number; // string if null, and the number value is a unix timestamp
    gmnotes?: string | number; // string if null, and the number value is a unix timestamp
    archived?: boolean;

    // comma-separated lists of object ids
    attrorder?: string; // @NO-API
    abilorder?: string; // @NO-API
}

class Character extends HighLevelObject<ICharacterData> {

    private attribs: FirebaseCollection<Attribute, IAttributeData>;

    private tagsArray: string[] | null;
    private controlledBy: (Player | null)[] | null;
    private inJournals: (Player | null)[] | null;

    private bioBlob: FirebaseVar<string> | null;
    private gmNotesBlob: FirebaseVar<string> | null;
    private defaultTokenBlob: FirebaseVar<any> | null; // TODO : parse type

    public updateLowLevelData(newLow: ICharacterData): void {
        this.setNewLowLevel(newLow);

        this.tagsArray = null;
        this.controlledBy = null;
        this.inJournals = null;

        if (this.canAccessBlobs()) {
            if(!this.bioBlob) this.bioBlob = new FirebaseVar(this.getCampaign(), `/char-blobs/${this.getId()}/bio/`, (d: string) => Promise.resolve(d));
            if(!this.gmNotesBlob) this.gmNotesBlob = new FirebaseVar(this.getCampaign(), `/char-blobs/${this.getId()}/gmnotes/`, (d: string) => Promise.resolve(d));
            if(!this.defaultTokenBlob) this.defaultTokenBlob = new FirebaseVar(this.getCampaign(), `/char-blobs/${this.getId()}/defaulttoken/`, (d: string) => Promise.resolve(d));
        } else {
            this.bioBlob = null;
            this.gmNotesBlob = null;
            this.defaultTokenBlob = null
        }
    }

    public getBioBlob(): FirebaseVar<string> | null {
        return this.bioBlob;
    }

    public getDefaultTokenBlob(): FirebaseVar<any> | null {
        return this.defaultTokenBlob;
    }

    public getGMNotesBlob(): FirebaseVar<string> | null {
        return this.gmNotesBlob;
    }

    public getName(): string {
        return this.getLowLevel().name || "";
    }

    public getAvatarUrl(): string {
        return this.getLowLevel().avatar || "";
    }

    public getControlledBy(): (Player | null)[] {
        if (!this.controlledBy) {
            this.controlledBy = commaSeparatedToArray(this.getCampaign().getPlayers(), this.getLowLevel().controlledby || "");
        }

        return this.controlledBy;
    }

    public getInPlayersJournals(): (Player | null)[] {
        if (!this.inJournals) {
            this.inJournals = commaSeparatedToArray(this.getCampaign().getPlayers(), this.getLowLevel().inplayerjournals  || "");
        }

        return this.inJournals;
    }

    public getTags(): string[] {
        if (!this.tagsArray) {
            try {
                this.tagsArray = JSON.parse(this.getLowLevel().tags || "");
            } catch (err) {
                console.log(`Failed parsing tags for ${this.getId()}`);
                this.tagsArray = [];
            }

            if (!Array.isArray(this.tagsArray)) {
                this.tagsArray = [];
            }
        }

        return this.tagsArray;
    }

    public getId(): string {
        return this.getLowLevel().id || "";
    }

    public isArchived(): boolean {
        return this.getLowLevel().archived || false
    }

    public static async fromRaw(
        rawData: ICharacterData,
        campaign: Campaign,
        fb: Firebase_Child_T) {

        const char = new Character(rawData, campaign, fb);

        char.attribs = new FirebaseCollection(
            campaign,
            `/char-attribs/char/${rawData.id}/`,
            Attribute.fromRaw
        );

        await Promise.all([
            char.attribs.getReadyPromise()
        ]);

        return char;
    }

    public canAccessBlobs() {
        console.log(this.getLowLevel());
        const controlledBy = this.getLowLevel().controlledby || "";
        return controlledBy.includes(this.getCampaign().getCurrentPlayerId());
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
    private players: FirebaseCollection<Player, IPlayerData>;

    private readyEvent: FunctionPool<() => void> = new FunctionPool();
    private ourPlayer: Player | null;

    public constructor(campaignIdString: string, gntkn: string, playerId: string) {
        // @ts-ignore
        this.firebase = new Firebase(`https://roll20-9.firebaseio.com/${campaignIdString}/`);
        this.firebase.authWithCustomToken(gntkn);
        this.playerId = playerId;

        this.chat = this.firebase.child("/chat/");

        this.characters = new FirebaseCollection<Character, ICharacterData>(
            this,
            "/characters/",
            Character.fromRaw
        );

        this.players = new FirebaseCollection<Player, IPlayerData>(
            this,
            "/players/",
            Player.fromRaw
        );

        Promise.all([
            this.characters.getReadyPromise(),
            this.players.getReadyPromise()
        ])
            .then(() => {
                this.readyEvent.fireAll();
            });
    }

    public getCurrentPlayerId() {
        return this.playerId;
    }

    public getCurrentPlayer(): Player {
        if (!this.ourPlayer) {
            this.ourPlayer = this.getPlayers().getById(this.playerId);
        }

        if (!this.ourPlayer) {
            console.error(`Cannot find local player who has id of ${this.playerId}`);
            // @ts-ignore
            return null;
        }

        return this.ourPlayer;
    }

    public getFirebase() {
        return this.firebase;
    }

    public getCharacters() {
        return this.characters;
    }

    public getPlayers() {
        return this.players;
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

abstract class FirebaseCommon<THigh, TLow, TInitial> {
    private campaign: Campaign;
    private url: string;
    private firebase: Firebase_Child_T;

    private addedEvent: FunctionPool<(data: THigh) => Promise<void>> = new FunctionPool();
    private changedEvent: FunctionPool<(data: THigh) => Promise<void>> = new FunctionPool();
    private removedEvent: FunctionPool<(data: THigh) => Promise<void>> = new FunctionPool();
    private readyEvent: FunctionPool<(data: TInitial) => Promise<void>> = new FunctionPool();

    private readyPromise: Promise<void>;
    private isReadyYet: boolean = false;

    public constructor(campaign: Campaign, url: string) {
        this.campaign = campaign;
        this.url = url;
        this.firebase = campaign.getFirebase().child(url);

        this.readyPromise = new Promise(ok => this.ready().on(async () => {
            console.log(`${this.url} IS READY`);
            ok();
        }));

        this.firebase.once("value", this.internalInit);

        console.log(`created firebase collection ${this.url}`);
    }


    private internalInit = async (firebaseData: any) => {
        const data: TInitial = firebaseData.val();

        await this.initData(data);

        if (!this.isReady()) {
            this.isReadyYet = true;
            this.readyEvent.fireAll();
        }
    };

    protected abstract async initData(data: TInitial): Promise<void>;

    public isReady() {
        return this.isReadyYet;
    }

    public getReadyPromise() {
        return this.readyPromise;
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

    public getCampaign() {
        return this.campaign;
    }

    public getFirebase() {
        return this.firebase;
    }

    public getURL() {
        return this.url;
    }
}

class FirebaseVar<THigh> extends FirebaseCommon<THigh, string, string> {

    private cache: THigh | null = null;

    private highLevelFactory: (a: string, b: Campaign, fb: Firebase_Child_T) => Promise<THigh>;

    public constructor(campaign: Campaign, url: string, factory: (a: string, b: Campaign, fb: Firebase_Child_T) => Promise<THigh>) {
        super(campaign, url);
        this.highLevelFactory = factory;
    }

    public get(): THigh | null {
        return this.cache;
    }

    public set(data: string) {
        this.getFirebase().set(data);
    }

    protected async initData(data: string): Promise<void> {
        this.cache = await this.highLevelFactory(data, this.getCampaign(), this.getFirebase());
    }
}

class FirebaseCollection<THigh extends HighLevelObject<TLow>, TLow> extends FirebaseCommon<THigh, TLow, { [id: string]: TLow }> {
    private byId: { [id: string]: THigh } = {};
    private idToIndex: { [id: string]: number } = {};
    private all: THigh[] = [];

    private highLevelFactory: (a: TLow, b: Campaign, fb: Firebase_Child_T) => Promise<THigh>;

    public constructor(campaign: Campaign, url: string, factory: (a: TLow, b: Campaign, fb: Firebase_Child_T) => Promise<THigh>) {
        super(campaign, url);
        this.highLevelFactory = factory;
    }

    private static deconstructFirebaseData(firebaseData: any) {
        return {
            data: firebaseData.val(),
            key: firebaseData.key()
        };
    }

    protected async initData(data: { [p: string]: TLow }): Promise<void> {
        for (const key in data) {
            if (this.doesKeyExist(key)) continue;

            const low = data[key];

            await this.internalAddOrChange(low, key, this.getFirebase().child(key));
        }

        this.getFirebase().on("child_added", this.defaultOnAdded);
        this.getFirebase().on("child_changed", this.defaultOnChanged);
        this.getFirebase().on("child_removed", this.defaultOnRemoved);
    }

    private defaultOnAdded = async (firebaseData: any) => {
        if (!this.isReady) return;

        const {data, key} = FirebaseCollection.deconstructFirebaseData(firebaseData);

        if (this.doesKeyExist(key)) return;

        const high = await this.internalAddOrChange(data, key, this.getFirebase().child(key));

        if (!high) {
            return;
        }

        console.log(`${key} added`);
        this.added().fireAll(high);
    };

    private defaultOnChanged = async (firebaseData: any) => {
        if (!this.isReady) return;

        const {data, key} = FirebaseCollection.deconstructFirebaseData(firebaseData);

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

    private async internalAddOrChange(data: TLow, key: string, fb: Firebase_Child_T): Promise<THigh | null> {
        return this.doesKeyExist(key)
            ? this.internalChange(data, key)
            : await this.internalAdd(data, key, fb);
    }

    private async internalAdd(data: TLow, key: string, fb: Firebase_Child_T): Promise<THigh> {
        const high = await this.highLevelFactory(data, this.getCampaign(), fb);

        this.idToIndex[key] = this.all.length;
        this.all.push(high);
        this.byId[key] = high;

        return high;
    }

    private internalChange(data: TLow, key: string): THigh | null {
        const existing = this.getById(key);
        if (!existing) return null;

        existing.updateLowLevelData(data);
        return existing;
    }

    private doesKeyExist(key: string): boolean {
        return this.getById(key) !== undefined;
    }

    private internalDelete(key: string): THigh {
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


    public getAllAsTable(): { [id: string]: THigh } {
        return this.byId;
    }

    public getById(id: string): THigh | null {
        return this.byId[id];
    }
}


const asyncCtx = async () => {

    const campaign = new Campaign(
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

    const playersStorage = campaign.getPlayers();

    playersStorage.ready().on(async () => {
        const me = campaign.getCurrentPlayer();
        me.setArbitrary("displayname", "stormy modififed");
    });

};

asyncCtx().catch(console.error);
