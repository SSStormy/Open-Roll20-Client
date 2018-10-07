import {HighArrayCommon} from "./HighArrayCommon";

export class HighCommaSeparatedIdArray<THigh>
    extends HighArrayCommon<THigh> {

    protected internalTryRepopulateWith(rawData: string): void {
        this.highCache = [];
        this.lowCache = [];

        this.lowCache = rawData.split(',');

        for (const id of this.lowCache) {

            const obj = this.lowToHigh(id);

            if (obj) {
                this.highCache.push(obj);
            } else {
                console.log(`lowToHigh returned null for data ${id}`);
            }
        }
    }

    protected getSyncData(): any {
        return this.lowCache.join(',');
    }
}
