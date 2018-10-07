import {Player} from "./Player";
import {IInlineRoll} from "../Interface/IInlineRoll";
import {HighLevelIdObject} from "../Abstract/HighLevelIdObject";
import {Firebase_Child_T} from "../Abstract/FirebaseTypes";
import {IChatMessageData} from "../Interface/IChatMessageData";
import {Roll20Client} from "../Roll20Client";


export class ChatMessage extends HighLevelIdObject<IChatMessageData> {

    private constructor(lowLevel: IChatMessageData, client: Roll20Client, fb: Firebase_Child_T) {
        super(lowLevel, client, fb);
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
        return this.getClient().players().getById(this.getLowLevel().playerid);
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
        client: Roll20Client,
        fb: Firebase_Child_T) {
        return new ChatMessage(rawData, client, fb);
    }

}
