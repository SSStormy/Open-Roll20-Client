import {FirebaseCollection} from "../Abstract/FirebaseCollection";
import {safeParseToInt} from "../Utils/SafeParseToInt";
import {HighLevelIdObject} from "../Abstract/HighLevelIdObject";
import {IPlayerData} from "../Interface/IPlayerData";
import {Firebase_Child_T} from "../Abstract/FirebaseTypes";
import {IAttributeData} from "../Interface/IAttributeData";
import {IMacroData} from "../Interface/IMacroData";
import {Roll20Client} from "../Roll20Client";
import {Macro} from "./Macro";

export class Player extends HighLevelIdObject<IPlayerData> {
    private macros: FirebaseCollection<Macro, IMacroData>;

    private constructor(lowLevel: IAttributeData, client: Roll20Client, fb: Firebase_Child_T) {
        super(lowLevel, client, fb);
        this.updateLowLevelData(lowLevel);

        this.macros = new FirebaseCollection(
            client,
            `/macros/player/${lowLevel.id}/`,
            Macro.fromRaw,
            "player macros"
        );
    }

    public updateLowLevelData(newLow: IPlayerData): void {
        this.setNewLowLevel(newLow);
    }

    public static async fromRaw(
        rawData: IPlayerData,
        client: Roll20Client,
        fb: Firebase_Child_T) {

        const player = new Player(rawData, client, fb);
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
        const p = this.getClient().getCurrentPlayer();
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
