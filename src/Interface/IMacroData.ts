import {IBaseLowData} from "./IBaseLowData";

export interface IMacroData extends IBaseLowData {
    action?: string;
    istokenaction: boolean;
    name: string;
    visibleto: string; //comma separated ids
}
