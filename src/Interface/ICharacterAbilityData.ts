import {IBaseLowData} from "./IBaseLowData";

export interface ICharacterAbilityData extends IBaseLowData {
    action?: string;
    description?: string;
    istokenaction?: boolean;
    name?: string;
    order?: number;
}
