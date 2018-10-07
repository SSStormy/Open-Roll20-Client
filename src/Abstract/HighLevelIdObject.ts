import {IBaseLowData} from "../Interface/IBaseLowData";
import {HighLevelObject} from "./HighLevelObject";

export abstract class HighLevelIdObject<TLow extends IBaseLowData> extends HighLevelObject<TLow> {
    public getId() {
        return this.getLowLevel().id;
    }
}
