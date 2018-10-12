import {IBaseLowData} from "./IBaseLowData";

export interface IChatMessageData extends IBaseLowData {
    avatar?: string;
    content?: string;
    inlinerolls?: IInlineRoll[];
    playerid?: string;
    type?: string;
    who?: string;
}


export interface IInlineRoll {
    expression: string;
    results: IInlineRollResults;
    rollid: string;
    signature: string;
}


export interface IInlineRollResults {
    resultType: string;
    rolls: (IRollData | IRollMath)[];
    total: number;
    type: string;
}

export interface IRollData {
    dice: number;
    results?: ({[id: string]: number})[];
    sides: number;
    type: string; // "R"
}

export interface IRollMath {
    expr: string; // "+1+2"
    type: string; // "M"
}
