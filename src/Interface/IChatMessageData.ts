import {IBaseLowData} from "./IBaseLowData";
import {IInlineRoll} from "./IInlineRoll";

export interface IChatMessageData extends IBaseLowData {
    avatar?: string;
    content?: string;
    inlinerolls?: IInlineRoll[];
    playerid?: string;
    type?: string;
    who?: string;

}
