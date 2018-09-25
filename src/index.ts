const firebase = require("firebase");

export type Firebase_T = any;
export type Firebase_Child_T = any;

export interface IBaseLowData {
    id: string;
}

// TODO : import these from roll20.d.ts

export abstract class HighLevelObject<TLow extends IBaseLowData> {
    private lowLevel: TLow;
    private previousLowLevel: TLow | null = null;
    private campaign: Campaign;
    private firebase: Firebase_Child_T;

    public constructor(lowLevel: TLow, campaign: Campaign, fb: Firebase_Child_T) {
        this.campaign = campaign;
        this.firebase = fb;
    }

    public destroy() {
        return this.firebase.remove();
    }

    public getId() {
        return this.getLowLevel().id;
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
        return new Promise((ok, err) => {
            this.getFirebase().child(varName).set(data, (e: any) => {
                if (e) {
                    err(e);
                    return;
                }
                ok();
            });
        });
    }
}


export interface IAttributeData extends IBaseLowData {
    name?: string;
    current?: string;
    max?: string;
}

export class Attribute extends HighLevelObject<IAttributeData> {

    private constructor(lowLevel: IAttributeData, campaign: Campaign, fb: Firebase_Child_T) {
        super(lowLevel, campaign, fb);
        this.updateLowLevelData(lowLevel);
    }

    public static async fromRaw(rawData: IAttributeData, campaign: Campaign, fb: Firebase_Child_T) {
        return new Attribute(rawData, campaign, fb);
    }

    public updateLowLevelData(newLow: IAttributeData): void {
        this.setNewLowLevel(newLow);
    }

    public getName() {
        return this.getLowLevel().name || "";
    }

    public setName(name: string) {
        return this.setArbitrary("name", name);
    }

    public getCurrentValue() {
        return this.getLowLevel().current || "";
    }

    public setCurrentValue(current: string) {
        return this.setArbitrary("current", current);
    }

    public getMaxValue() {
        return this.getLowLevel().max || "";
    }

    public setMaxValue(max: string) {
        return this.setArbitrary("max", max);
    }
}

export interface IMacroData extends IBaseLowData {
    action?: string;
    istokenaction: boolean;
    name: string;
    visibleto: string; //comma separated ids
}

export interface IHighArray<THigh> {
    invalidateCache(): void;

    tryRepopulate(): void

    getLocalValues(): THigh[];

    add(obj: THigh): Promise<boolean>;

    remove(obj: THigh): Promise<boolean>;

    clear(): Promise<void>;
}

// TODO : expose added, removed events for this array wrapper
export abstract class HighArrayCommon<THigh>
    implements IHighArray<THigh> {

    protected highCache: THigh[];
    protected lowCache: string[];

    protected dataName: string;
    protected parent: HighLevelObject<any>;
    protected isCacheValid: boolean = false;

    protected dataSelector: (obj: THigh) => string;
    protected lowToHigh: (obj: string) => THigh | null;

    public constructor(
        dataName: string,
        parent: HighLevelObject<any>,
        lowToHigh: (obj: string) => THigh | null,
        dataSelector: (obj: THigh) => string) {

        this.dataSelector = dataSelector;
        this.dataName = dataName;
        this.parent = parent;
        this.lowToHigh = lowToHigh;
    }

    protected abstract getSyncData(): any;

    protected abstract internalTryRepopulateWith(rawData: string): void;

    private async sync() {
        const data = this.getSyncData();
        return await this.parent.setArbitrary(this.dataName, data);
    }

    public async clear() {
        this.lowCache = [];
        this.highCache = [];
        await this.sync();
    }

    public async add(obj: THigh) {
        const data = this.dataSelector(obj);

        this.lowCache.push(data);
        this.highCache.push(obj);

        await this.sync();

        // TODO : uniqueness?
        return true;
    }

    public async remove(obj: THigh) {
        const rmFromArr = <T>(arr: T[], eqFx: (a: T) => boolean): boolean => {
            let wasRemoved = false;

            let idx = arr.length;

            while (idx-- > 0) {
                const val = arr[idx];

                if (eqFx(val)) {
                    arr.splice(idx, 1);
                    wasRemoved = true;
                }
            }

            return wasRemoved;
        };

        const objId = this.dataSelector(obj);

        const lowArrayWasRemoved = rmFromArr(this.lowCache, lowD => lowD === objId);
        rmFromArr(this.highCache, highD => this.dataSelector(highD) === objId);

        await this.sync();

        return lowArrayWasRemoved;
    }

    public getLocalValues(): THigh[] {
        return this.highCache;
    }

    public invalidateCache(): void {
        this.isCacheValid = false;
    }


    public tryRepopulate(): void {
        const data = this.parent.getArbitrary(this.dataName);
        if (!data) return;

        if (this.isCacheValid) return;
        this.isCacheValid = true;

        this.internalTryRepopulateWith(data);
    }
}

export class HighJsonIdArray<THigh>
    extends HighArrayCommon<THigh> {

    protected internalTryRepopulateWith(rawData: string): void {
        try {
            // TODO : @HACK
            this.lowCache = JSON.parse(rawData);
            this.highCache = JSON.parse(rawData);
        } catch (err) {
            console.log(`Failed to parse json id array data ${err}`);
        }
    }

    protected getSyncData(): any {
        return JSON.stringify(this.lowCache);
    }
}

export class HighCommaSeparatedIdArray<THigh>
    extends HighArrayCommon<THigh> {

    protected internalTryRepopulateWith(rawData: string): void {
        this.highCache = [];
        this.lowCache = [];

        this.lowCache = rawData.split(',');

        for (const id of this.lowCache) {

            const obj = this.lowToHigh(id);

            if (obj) {
                this.highCache.push(obj);
            } else {
                console.log(`lowToHigh returned null for data ${id}`);
            }
        }
    }

    protected getSyncData(): any {
        return this.lowCache.join(',');
    }
}

export class Macro extends HighLevelObject<IMacroData> {

    private visibleToArray: IHighArray<Player>;

    private constructor(lowLevel: IMacroData, campaign: Campaign, fb: Firebase_Child_T) {
        super(lowLevel, campaign, fb);
        this.updateLowLevelData(lowLevel);

        this.visibleToArray = new HighCommaSeparatedIdArray<Player>(
            "visibleto",
            this,
            (id: string) => campaign.players().getById(id),
            (obj: Player) => obj.getId()
        );
    }

    public updateLowLevelData(newLow: IMacroData): void {
        this.setNewLowLevel(newLow);

        if(this.visibleToArray) this.visibleToArray.invalidateCache();
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

    public setAction(action: string) {
        return this.setArbitrary("action", action);
    }

    public isTokenAction() {
        return this.getLowLevel().istokenaction;
    }

    public setIsTokenAction(state: boolean) {
        return this.setArbitrary("istokenaction", state);
    }

    public getName() {
        return this.getLowLevel().name;
    }

    public setName(name: string) {
        return this.setArbitrary("name", name);
    }

    public visibleTo() {
        this.visibleToArray.tryRepopulate();
        return this.visibleToArray;
    }
}

export interface IPlayerData extends IBaseLowData {
    color?: string;
    d20userid?: string;
    d20username?: string;
    displayname?: string;
    online?: boolean;
    speakingas?: string;
    chatbeepenabled?: boolean;
    globalvolume?: number;
    advShortcuts?: boolean; // @NO-API
    adv_fow_revealed?: string; // @NO-API
    alphatokenactions?: boolean; // @NO-API
    apptddiceenabled?: boolean; // @NO-API
    bigsearchstyle?: boolean; // @NO-API
    chatavatarsenabled?: boolean; // @NO-API
    chattimestampsenabled?: boolean; // @NO-API
    diceiconsenabled?: boolean; // @NO-API
    disableagency?: boolean; // @NO-API

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

const safeParseToInt = (val: any) => {
    const type = typeof(val);
    if (type === "number") return val;
    if (type === "string") return parseInt(val, 10);
    return NaN;
};

export class Player extends HighLevelObject<IPlayerData> {
    private macros: FirebaseCollection<Macro, IMacroData>;

    private constructor(lowLevel: IAttributeData, campaign: Campaign, fb: Firebase_Child_T) {
        super(lowLevel, campaign, fb);
        this.updateLowLevelData(lowLevel);

        this.macros = new FirebaseCollection(
            campaign,
            `/macros/player/${lowLevel.id}/`,
            Macro.fromRaw
        );
    }

    public updateLowLevelData(newLow: IPlayerData): void {
        this.setNewLowLevel(newLow);
    }

    public static async fromRaw(
        rawData: IPlayerData,
        campaign: Campaign,
        fb: Firebase_Child_T) {

        const player = new Player(rawData, campaign, fb);
        await player.macros.getReadyPromise();
        return player;
    }

    public getColor(): string {
        return this.getLowLevel().color || "";
    }

    public setColor(color: string) {
        return this.setArbitrary("color", color);
    }

    public isUs(): boolean {
        const p = this.getCampaign().getCurrentPlayer();
        if (!p) return false;

        return this.getUserAccountId() === p.getUserAccountId();
    }

    public getUserAccountId(): string {
        return this.getLowLevel().d20userid || ""
    }

    public setUserId(id: string) {
        return this.setArbitrary("d20userid", id);
    }

    public getUsername(): string {
        return this.getLowLevel().d20username || "";
    }

    public setUsername(username: string) {
        return this.setArbitrary("d20username", username);
    }

    public getDisplayName(): string {
        return this.getLowLevel().displayname || "";
    }

    public setDisplayName(displayName: string) {
        return this.setArbitrary("displayname", displayName);
    }

    public getGlobalVolume(): number {
        return safeParseToInt(this.getLowLevel().globalvolume);
    }

    public setGlobalVolume(val: number) {
        return this.setArbitrary("globalvolume", val);
    }

    public isOnline(): boolean {
        return this.getLowLevel().online || false;
    }

    public setIsOnline(state: boolean) {
        return this.setArbitrary("online", state);
    }

    public getSpeakingAs(): string {
        return this.getLowLevel().speakingas || "";
    }

    public setSpeakingAs(speakingAs: string) {
        return this.setArbitrary("speakingas", speakingAs);
    }

    public isChatBeepEnabled(): boolean {
        return this.getLowLevel().chatbeepenabled || true;
    }

    public setChatBeepEnabled(val: boolean) {
        return this.setArbitrary("chatbeepenabled", val);
    }
}

export interface ICharacterAbilityData extends IBaseLowData {
    action?: string;
    description?: string;
    istokenaction?: boolean;
    name?: string;
    order?: number;
}

export class CharacterAbility extends HighLevelObject<ICharacterAbilityData> {

    private constructor(lowLevel: IAttributeData, campaign: Campaign, fb: Firebase_Child_T) {
        super(lowLevel, campaign, fb);
        this.updateLowLevelData(lowLevel);
    }

    public static async fromRaw(rawData: IAttributeData, campaign: Campaign, fb: Firebase_Child_T) {
        return new CharacterAbility(rawData, campaign, fb);
    }

    public updateLowLevelData(newLow: ICharacterAbilityData): void {
        this.setNewLowLevel(newLow);
    }

    public getAction(): string {
        return this.getLowLevel().action || "";
    }

    public setAction(action: string) {
        return this.setArbitrary("action", action);
    }

    public getDescription(): string {
        return this.getLowLevel().description || "";
    }

    public setDescription(desc: string) {
        return this.setArbitrary("description", desc);
    }

    public getIsTokenAction(): boolean {
        return this.getLowLevel().istokenaction || false;
    }

    public setIsTokenAction(state: boolean) {
        return this.setArbitrary("istokenaction", state);
    }

    public getName(): string {
        return this.getLowLevel().name || "";
    }

    public setName(name: string) {
        return this.setArbitrary("name", name);
    }

    public getOrder(): number {
        return safeParseToInt(this.getLowLevel().order);
    }

    public setOrder(order: number) {
        return this.setArbitrary("order", order);
    }
}


export interface ICharacterData extends IBaseLowData {
    name?: string;
    avatar?: string;
    tags?: string;
    controlledby?: string;
    inplayerjournals?: string;
    defaulttoken?: number | string; // string if null, and the number value is a unix timestamp
    bio?: string | number; // string if null, and the number value is a unix timestamp
    gmnotes?: string | number; // string if null, and the number value is a unix timestamp
    archived?: boolean;

    // comma-separated lists of object ids
    attrorder?: string; // @NO-API
    abilorder?: string; // @NO-API
}

export class Character extends HighLevelObject<ICharacterData> {

    private _attributes: FirebaseCollection<Attribute, IAttributeData>;
    private _abilities: FirebaseCollection<CharacterAbility, ICharacterAbilityData>;

    private highTagsArray: IHighArray<string>;
    private highControlledBy: IHighArray<Player>;
    private highInJournals: IHighArray<Player>;

    private bioBlob: FirebaseVar<string> | null;
    private gmNotesBlob: FirebaseVar<string> | null;
    private defaultTokenBlob: FirebaseVar<any> | null; // TODO : parse type

    private constructor(lowLevel: ICharacterData, campaign: Campaign, fb: Firebase_Child_T) {
        super(lowLevel, campaign, fb);
        this.updateLowLevelData(lowLevel);

        const players = campaign.players();
        const getPlayerId = (obj: Player) => obj.getId();

        this.highTagsArray = new HighJsonIdArray(
            "tags",
            this,
            (obj: string): string | null => obj,
            (obj: string) => obj
        );

        this.highControlledBy = new HighCommaSeparatedIdArray(
            "controlledby",
            this,
            players.getById,
            getPlayerId
        );

        this.highInJournals = new HighCommaSeparatedIdArray(
            "inplayerjournals",
            this,
            players.getById,
            getPlayerId
        );

        this._attributes = new FirebaseCollection(
            campaign,
            `/char-attribs/char/${lowLevel.id}/`,
            Attribute.fromRaw
        );

        this._abilities = new FirebaseCollection(
            campaign,
            `/char-abils/char/${lowLevel.id}/`,
            CharacterAbility.fromRaw
        );

        this.bioBlob = new FirebaseVar(this.getCampaign(), `/char-blobs/${this.getId()}/bio/`, (d: string) => Promise.resolve(d));
        this.gmNotesBlob = new FirebaseVar(this.getCampaign(), `/char-blobs/${this.getId()}/gmnotes/`, (d: string) => Promise.resolve(d));
        this.defaultTokenBlob = new FirebaseVar(this.getCampaign(), `/char-blobs/${this.getId()}/defaulttoken/`, (d: string) => Promise.resolve(d));
    }

    public updateLowLevelData(newLow: ICharacterData): void {
        this.setNewLowLevel(newLow);

        if(this.highTagsArray) this.highTagsArray.invalidateCache();
        if(this.highControlledBy) this.highControlledBy.invalidateCache();
        if(this.highInJournals) this.highInJournals.invalidateCache();
    }

    public static async fromRaw(
        rawData: ICharacterData,
        campaign: Campaign,
        fb: Firebase_Child_T) {

        const char = new Character(rawData, campaign, fb);

        await Promise.all([
            char._attributes.getReadyPromise(),
            char._abilities.getReadyPromise()
        ]);

        return char;
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

    public getControlledBy(): IHighArray<Player> {
        this.highControlledBy.tryRepopulate();
        return this.highControlledBy;
    }

    public getInPlayersJournals(): IHighArray<Player> {
        this.highInJournals.tryRepopulate();
        return this.highInJournals;
    }

    public getTags(): IHighArray<string> {
        this.highTagsArray.tryRepopulate();
        return this.highTagsArray;
    }

    public getId(): string {
        return this.getLowLevel().id || "";
    }

    public isArchived(): boolean {
        return this.getLowLevel().archived || false
    }

    public getName(): string {
        return this.getLowLevel().name || "";
    }

    public setName(name: string) {
        return this.setArbitrary("name", name);
    }

    public getAvatarURL(): string {
        return this.getLowLevel().avatar || "";
    }

    public setAvatarURL(url: string) {
        return this.setArbitrary("avatar", url);
    }

    public canAccessBlobs() {

        const controlledBy = this.getLowLevel().controlledby || "";
        return controlledBy.includes(this.getCampaign().getCurrentPlayerId());
    }

    public attributes() {
        return this._attributes;
    }

    public abilities() {
        return this._abilities;
    }
}

export interface IChatMessageData extends IBaseLowData {

    /*
avatar: '/users/avatar/1460146/30',
    content: 'test memz $[[0]] $[[1]]',
    inlinerolls:
        [ { expression: '1d8',
            results: [Object],
            rollid: '-LN1wm7JbKCt6H_Pryn_',
            signature:
                '' },
            { expression: '5d20+5',
                results: { resultType: 'sum',
                    rolls: [ { dice: 1, results: [
                        { dice: 1, results: [ { v: 13 } ], sides: 20, type: 'R' }
                    ], sides: 8, type: 'R' } ],
                    total: 6,
                    type: 'V' },
                rollid: '-LN1wm7KAn6cOcAPe15l',
                signature:
                    '' } ],
    playerid: '-LLDzVWKvJl7qGUiF0m5',
    type: 'general',
    who: 'stormy_lmao (GM)',
    id: '-LN1wmGJiKTQq7tobuFD' }
    */

    avatar?: string;
    content?: string;
    inlinerolls?: IInlineRoll[];
    playerid?: string;
    type?: string;
    who?: string;

}

export interface IInlineRoll {
    expression?: string;
    results?: IInlineRollResults;
    rollid?: string;
    signature?: string;
}

export interface IInlineRollResults {
    resultType?: string;
    rolls?: IRollData[];
    total?: number;
    type?: string;
}

export interface IRollData {
    dice?: number;
    results?: {
        dice?: number;
        results?: { [id: string]: number };
        sides?: number;
        type?: string;
    };
    sides?: number;
    type?: string;
}

export class ChatMessage extends HighLevelObject<IChatMessageData> {

    private constructor(lowLevel: IChatMessageData, campaign: Campaign, fb: Firebase_Child_T) {
        super(lowLevel, campaign, fb);
        this.updateLowLevelData(lowLevel);
    }

    public getInlineRolls(): IInlineRoll[] {
        return this.getLowLevel().inlinerolls || [];
    }

    public getAvatar(): string {
        return this.getLowLevel().avatar || "";
    }

    public getContent(): string {
        return this.getLowLevel().content || "";
    }

    public getPlayer(): Player | null {
        return this.getCampaign().players().getById(this.getLowLevel().playerid);
    }

    public getType(): string {
        return this.getLowLevel().type || "";
    }

    public getSpeakingAs(): string {
        return this.getLowLevel().who || "";
    }

    public updateLowLevelData(newLow: IChatMessageData): void {
        this.setNewLowLevel(newLow);
    }

    public static async fromRaw(
        rawData: IChatMessageData,
        campaign: Campaign,
        fb: Firebase_Child_T) {
        return new ChatMessage(rawData, campaign, fb);
    }

}

export class Campaign {
    public firebase: Firebase_T;

    private playerId: string;

    private characterCollectin: FirebaseCollection<Character, ICharacterData>;
    private playerCollection: FirebaseCollection<Player, IPlayerData>;
    private chatMessages: FirebaseCollection<ChatMessage, IChatMessageData>;

    private readyEvent: FunctionPoolForReadyEvents<() => void> = new FunctionPoolForReadyEvents();
    private ourPlayer: Player | null;

    public constructor(campaignUrl: string, playerId: string, gntkn: string) {
        // @ts-ignore
        this.firebase = new Firebase(campaignUrl);
        this.chatMessages = this.firebase.child("/chat/");
        this.playerId = playerId;

        this.characterCollectin = new FirebaseCollection<Character, ICharacterData>(
            this,
            "/characters/",
            Character.fromRaw
        );


        this.playerCollection = new FirebaseCollection<Player, IPlayerData>(
            this,
            "/players/",
            Player.fromRaw
        );

        this.chatMessages = new FirebaseCollection<ChatMessage, IChatMessageData>(
            this,
            "/chat/",
            ChatMessage.fromRaw
        );

        this.getFirebase().on("value", (v: any) => {
            console.log(v);
        });

        Promise.all([
            this.characterCollectin.getReadyPromise(),
            this.playerCollection.getReadyPromise(),
            this.chatMessages.getReadyPromise()
        ])
            .then(() => {
                console.log("READY!");
                this.readyEvent.setReady();
                this.readyEvent.fireAll();
            });

        // Note(Justas): Bug in firebase: all but one last promise returned from authWithCustomToken
        // will fail to properly resolve, meaning we cannot await this or we deadlock :(.
        this.getFirebase().authWithCustomToken(gntkn);
    }

    public getCurrentPlayerId() {
        return this.playerId;
    }

    public getCurrentPlayer(): Player | null {
        if (!this.characters().isReady()) {
            throw new Error("Cannot get current player until the character collection is ready.");
        }

        if (!this.ourPlayer) {
            this.ourPlayer = this.players().getById(this.playerId);
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

    public characters() {
        return this.characterCollectin;
    }

    public players() {
        return this.playerCollection;
    }

    public chat() {
        return this.chatMessages;
    }

    public ready() {
        return this.readyEvent;
    }

    public say(content: string, who: string = "not a bot", type: string = "general") {
        return new Promise((ok, err) => {
            const fb = this.chatMessages.getFirebase();

            const data = {
                content,
                playerid: this.playerId,
                who,
                type,
            };

            console.log("before ref");
            const ref = fb.push(data, (e: any) => {
                console.log("ref callback");
                if (e) {
                    err(e);
                    return;
                }

                // @ts-ignore
                const priority = Firebase.ServerValue.TIMESTAMP;

                const msgRef = fb.child(ref.key()).setPriority(priority, (e2: any) => {
                    if (e2) {
                        err(e2);
                        return;
                    }

                    ok(msgRef);
                });
            });
        });

    }
}

interface IFunctionPool<T> {
    on: (fx: T) => void;
    off: (fx: T) => void;
    fireAll: (...args: any[]) => void;
}

export class FunctionPool<T> implements IFunctionPool<T> {
    private fxList: T[] = [];

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

export class FunctionPoolForReadyEvents<T> implements IFunctionPool<T> {
    private _pool: FunctionPool<T> = new FunctionPool<T>();
    private _ready: boolean = false;

    public setReady() {
        this._ready = true;
    }

    public fireAll(...args: any[]) {
        this._pool.fireAll(args);
    };

    public off(fx: T): void {
        this._pool.off(fx);
    }

    public on(fx: T): void {
        // since we are already ready, call the callback.
        if (this._ready) {
            (<any>fx).apply(null, true);
        }

        this._pool.on(fx);
    }
}

export abstract class FirebaseCommon<THigh, TLow, TInitial> {
    private campaign: Campaign;
    private url: string;
    private firebase: Firebase_Child_T;

    private addedEvent: FunctionPool<(data: THigh) => Promise<void>> = new FunctionPool();
    private changedEvent: FunctionPool<(data: THigh) => Promise<void>> = new FunctionPool();
    private removedEvent: FunctionPool<(data: THigh) => Promise<void>> = new FunctionPool();
    private readyEvent: FunctionPoolForReadyEvents<(data: TInitial) => Promise<void>>
        = new FunctionPoolForReadyEvents();

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
            this.ready().setReady();
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

export class FirebaseVar<THigh> extends FirebaseCommon<THigh, string, string> {

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

export class FirebaseCollection<THigh extends HighLevelObject<TLow>, TLow extends IBaseLowData> extends FirebaseCommon<THigh, TLow, { [id: string]: TLow }> {
    private byId: { [id: string]: THigh } = {};
    private idToIndex: { [id: string]: number } = {};
    private all: THigh[] = [];

    private createPromisesResolves: { [id: string]: (data: THigh) => void } = {};

    private highLevelFactory: (a: TLow, b: Campaign, fb: Firebase_Child_T) => Promise<THigh>;

    public constructor(campaign: Campaign, url: string, factory: (a: TLow, b: Campaign, fb: Firebase_Child_T) => Promise<THigh>) {
        super(campaign, url);
        this.highLevelFactory = factory;
    }

    public create(): Promise<THigh> {
        // @ts-ignore
        const priority = Firebase.ServerValue.TIMESTAMP;
        const key = this.getFirebase().push().key();

        const low: IBaseLowData = {
            id: key
        };

        return new Promise((ok, err) => {

            this.getFirebase().child(key).setWithPriority(low, priority, (e: any) => {
                if (e) {
                    err(e);
                    return;
                }
            });

            this.createPromisesResolves[key] = ok;
        });
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

        {
            const promiseResolve = this.createPromisesResolves[key];
            if (promiseResolve) {
                promiseResolve(high);
            }
        }

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

        if (!data.id) {
            data.id = key;
        }

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

    public getById = (id: string | null | undefined): THigh | null => {
        if (!id) return null;

        return this.byId[id];
    }
}




