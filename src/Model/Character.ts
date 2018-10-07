import {IHighArray} from "../Interface/IHighArray";
import {Player} from "./Player";
import {FirebaseVar} from "../Abstract/FirebaseVar";
import {Attribute} from "./Attribute";
import {ICharacterAbilityData} from "../Interface/ICharacterAbilityData";
import {IAttributeData} from "../Interface/IAttributeData";
import {HighCommaSeparatedIdArray} from "../Abstract/HighCommaSeparatedIdArray";
import {CharacterAbility} from "./CharacterAbility";
import {ICharacterData} from "../Interface/ICharacterData";
import {Roll20Client} from "../Roll20Client";
import {FirebaseCollection} from "../Abstract/FirebaseCollection";
import {HighJsonIdArray} from "../Abstract/HighJsonIdArray";
import {HighLevelIdObject} from "../Abstract/HighLevelIdObject";
import {Firebase_Child_T} from "../Abstract/FirebaseTypes";

export class Character extends HighLevelIdObject<ICharacterData> {

    private _attributes: FirebaseCollection<Attribute, IAttributeData>;
    private _abilities: FirebaseCollection<CharacterAbility, ICharacterAbilityData>;

    private highTagsArray: IHighArray<string>;
    private highControlledBy: IHighArray<Player>;
    private highInJournals: IHighArray<Player>;

    private bioBlob: FirebaseVar<string> | null;
    private gmNotesBlob: FirebaseVar<string> | null;
    private defaultTokenBlob: FirebaseVar<any> | null; // TODO : parse type

    private constructor(lowLevel: ICharacterData, client: Roll20Client, fb: Firebase_Child_T) {
        super(lowLevel, client, fb);
        this.updateLowLevelData(lowLevel);

        const players = client.players();
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
            client,
            `/char-attribs/char/${lowLevel.id}/`,
            Attribute.fromRaw,
            "character attributes"
        );

        this._abilities = new FirebaseCollection(
            client,
            `/char-abils/char/${lowLevel.id}/`,
            CharacterAbility.fromRaw,
            "character abilities"
        );

        this.bioBlob = new FirebaseVar(this.getClient(), `/char-blobs/${this.getId()}/bio/`, (d: string) => Promise.resolve(d), "character bio blob");
        this.gmNotesBlob = new FirebaseVar(this.getClient(), `/char-blobs/${this.getId()}/gmnotes/`, (d: string) => Promise.resolve(d), "character gmnotes blob");
        this.defaultTokenBlob = new FirebaseVar(this.getClient(), `/char-blobs/${this.getId()}/defaulttoken/`, (d: string) => Promise.resolve(d), "character defaultoken blob");
    }

    public updateLowLevelData(newLow: ICharacterData): void {
        this.setNewLowLevel(newLow);

        if (this.highTagsArray) this.highTagsArray.invalidateCache();
        if (this.highControlledBy) this.highControlledBy.invalidateCache();
        if (this.highInJournals) this.highInJournals.invalidateCache();
    }

    public static async fromRaw(
        rawData: ICharacterData,
        client: Roll20Client,
        fb: Firebase_Child_T) {

        const char = new Character(rawData, client, fb);

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
        return controlledBy.includes(this.getClient().getCurrentPlayerId());
    }

    public attributes() {
        return this._attributes;
    }

    public abilities() {
        return this._abilities;
    }

    public tags(): IHighArray<string> {
        this.highTagsArray.tryRepopulate();
        return this.highTagsArray;
    }
}
