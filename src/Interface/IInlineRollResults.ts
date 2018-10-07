import {IRollData} from "./IRollData";

export interface IInlineRollResults {
    resultType?: string;
    rolls?: IRollData[];
    total?: number;
    type?: string;
}
