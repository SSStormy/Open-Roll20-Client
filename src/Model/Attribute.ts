import {HighLevelIdObject} from "../Abstract/HighLevelIdObject";
import {Firebase_Child_T} from "../Abstract/FirebaseTypes";
import {IAttributeData} from "../Interface/IAttributeData";
import {Roll20Client} from "../Roll20Client";

export class Attribute extends HighLevelIdObject<IAttributeData> {

    private constructor(lowLevel: IAttributeData, client: Roll20Client, fb: Firebase_Child_T) {
        super(lowLevel, client, fb);
        this.updateLowLevelData(lowLevel);
    }

    public static async fromRaw(rawData: IAttributeData, client: Roll20Client, fb: Firebase_Child_T) {
        return new Attribute(rawData, client, fb);
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
