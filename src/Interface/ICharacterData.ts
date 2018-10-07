import {IBaseLowData} from "./IBaseLowData";

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
