// TODO : expose added, removed events for this array wrapper

import {IHighArray} from "../Interface/IHighArray";
import {HighLevelIdObject} from "./HighLevelIdObject";

export abstract class HighArrayCommon<THigh>
    implements IHighArray<THigh> {

    protected highCache: THigh[];
    protected lowCache: string[];

    protected dataName: string;
    protected parent: HighLevelIdObject<any>;
    protected isCacheValid: boolean = false;

    protected dataSelector: (obj: THigh) => string;
    protected lowToHigh: (obj: string) => THigh | null;

    public constructor(
        dataName: string,
        parent: HighLevelIdObject<any>,
        lowToHigh: (obj: string) => THigh | null,
        dataSelector: (obj: THigh) => string) {

        this.dataSelector = dataSelector;
        this.dataName = dataName;
        this.parent = parent;
        this.lowToHigh = lowToHigh;
    }

    protected abstract getSyncData(): any;

    protected abstract internalTryRepopulateWith(rawData: string): void;

    private async sync() {
        const data = this.getSyncData();
        return await this.parent.setArbitrary(this.dataName, data);
    }

    public async clear() {
        this.lowCache = [];
        this.highCache = [];
        await this.sync();
    }

    public async add(obj: THigh) {
        const data = this.dataSelector(obj);

        this.lowCache.push(data);
        this.highCache.push(obj);

        await this.sync();

        // TODO : uniqueness?
        return true;
    }

    public async remove(obj: THigh) {
        const rmFromArr = <T>(arr: T[], eqFx: (a: T) => boolean): boolean => {
            let wasRemoved = false;

            let idx = arr.length;

            while (idx-- > 0) {
                const val = arr[idx];

                if (eqFx(val)) {
                    arr.splice(idx, 1);
                    wasRemoved = true;
                }
            }

            return wasRemoved;
        };

        const objId = this.dataSelector(obj);

        const lowArrayWasRemoved = rmFromArr(this.lowCache, lowD => lowD === objId);
        rmFromArr(this.highCache, highD => this.dataSelector(highD) === objId);

        await this.sync();

        return lowArrayWasRemoved;
    }

    public getLocalValues(): THigh[] {
        return this.highCache;
    }

    public invalidateCache(): void {
        this.isCacheValid = false;
    }


    public tryRepopulate(): void {
        const data = this.parent.getArbitrary(this.dataName);
        if (!data) return;

        if (this.isCacheValid) return;
        this.isCacheValid = true;

        this.internalTryRepopulateWith(data);
    }
}
