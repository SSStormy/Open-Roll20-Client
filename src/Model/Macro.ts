import {IHighArray} from "../Interface/IHighArray";
import {Player} from "./Player";
import {HighLevelIdObject} from "../Abstract/HighLevelIdObject";
import {Firebase_Child_T} from "../Abstract/FirebaseTypes";
import {HighCommaSeparatedIdArray} from "../Abstract/HighCommaSeparatedIdArray";
import {IMacroData} from "../Interface/IMacroData";
import {Roll20Client} from "../Roll20Client";

export class Macro extends HighLevelIdObject<IMacroData> {

    private visibleToArray: IHighArray<Player>;

    private constructor(lowLevel: IMacroData, client: Roll20Client, fb: Firebase_Child_T) {
        super(lowLevel, client, fb);
        this.updateLowLevelData(lowLevel);

        this.visibleToArray = new HighCommaSeparatedIdArray<Player>(
            "visibleto",
            this,
            (id: string) => client.players().getById(id),
            (obj: Player) => obj.getId()
        );
    }

    public updateLowLevelData(newLow: IMacroData): void {
        this.setNewLowLevel(newLow);

        if (this.visibleToArray) this.visibleToArray.invalidateCache();
    }

    public static async fromRaw(
        rawData: IMacroData,
        client: Roll20Client,
        fb: Firebase_Child_T) {

        return new Macro(rawData, client, fb);
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
