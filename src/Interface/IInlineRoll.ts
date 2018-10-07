import {IInlineRollResults} from "./IInlineRollResults";

export interface IInlineRoll {
    expression?: string;
    results?: IInlineRollResults;
    rollid?: string;
    signature?: string;
}
