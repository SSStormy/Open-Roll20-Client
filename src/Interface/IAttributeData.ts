import {IBaseLowData} from "./IBaseLowData";

export interface IAttributeData extends IBaseLowData {
    name?: string;
    current?: string;
    max?: string;
}
