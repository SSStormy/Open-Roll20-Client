import {HighArrayCommon} from "./HighArrayCommon";

export class HighJsonIdArray<THigh>
    extends HighArrayCommon<THigh> {

    protected internalTryRepopulateWith(rawData: string): void {
        try {
            // TODO : @HACK
            this.lowCache = JSON.parse(rawData);
            this.highCache = JSON.parse(rawData);
        } catch (err) {
            console.log(`Failed to parse json id array data ${err}`);
        }
    }

    protected getSyncData(): any {
        return JSON.stringify(this.lowCache);
    }
}
