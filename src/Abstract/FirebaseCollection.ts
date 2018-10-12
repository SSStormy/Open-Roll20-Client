import {HighLevelIdObject} from "./HighLevelIdObject";
import {IBaseLowData} from "../Interface/IBaseLowData";
import {FirebaseCommon} from "./FirebaseCommon";
import {Firebase_Child_T} from "./FirebaseTypes";
import {Roll20Client} from "../Roll20Client";
import {LowLevelNoId} from "../Utils/LowLevelNoId";

export class FirebaseCollection<THigh extends HighLevelIdObject<TLow>, TLow extends IBaseLowData> extends FirebaseCommon<THigh, TLow, { [id: string]: TLow }> {
    private _byId: { [id: string]: THigh } = {};
    private _idToIndex: { [id: string]: number } = {};
    private _all: THigh[] = [];

    private _createPromisesResolves: { [id: string]: (data: THigh) => void } = {};
    private _highLevelFactory: (a: TLow, b: Roll20Client, fb: Firebase_Child_T) => Promise<THigh>;

    public constructor(client: Roll20Client,
                       url: string,
                       factory: (a: TLow, b: Roll20Client, fb: Firebase_Child_T) => Promise<THigh>,
                       purpose: string) {
        super(client, url, purpose);
        this._highLevelFactory = factory;
    }

    public create(initial?: LowLevelNoId<TLow>): Promise<THigh> {
        this._log.debug(`Firebase collection ${this._purpose}: Creating new object.`);

        // @ts-ignore
        const priority = Firebase.ServerValue.TIMESTAMP;

        const key = this.getFirebase().push().key();

        const data: any = {
            // @ts-ignore
            ...initial,
            id: key
        };

        return new Promise((ok, err) => {
            this._createPromisesResolves[key] = ok;

            this.getFirebase().child(key).setWithPriority(data, priority, (e: any) => {
                this._log.debug(`Firebase collection ${this._purpose}: IN SET PRIORITY CALLBACK`);

                if (e) {
                    delete this._createPromisesResolves[key];
                    err(e);
                    return;
                }
            });
        })
    }

    private static deconstructFirebaseData(firebaseData: any) {


        return {
            data: firebaseData.val(),
            key: firebaseData.key()
        };
    }

    protected async initData(data: { [p: string]: TLow }): Promise<void> {
        for (const key in data) {
            if (this.doesKeyExist(key)) continue;

            const low = data[key];

            await this.internalAddOrChange(low, key, this.getFirebase().child(key));
        }

        this.getFirebase().on("child_added", this.defaultOnAdded);
        this.getFirebase().on("child_changed", this.defaultOnChanged);
        this.getFirebase().on("child_removed", this.defaultOnRemoved);
    }

    private defaultOnAdded = async (firebaseData: any) => {
        if (!this.isReady) return;

        const {data, key} = FirebaseCollection.deconstructFirebaseData(firebaseData);

        if (this.doesKeyExist(key)) return;

        const high = await this.internalAddOrChange(data, key, this.getFirebase().child(key));

        if (!high) {
            return;
        }

        {
            const promiseResolve = this._createPromisesResolves[key];
            if (promiseResolve) {
                promiseResolve(high);
            }
        }

        this.added().fireAll(high);
    };

    private defaultOnChanged = async (firebaseData: any) => {
        if (!this.isReady) return;

        const {data, key} = FirebaseCollection.deconstructFirebaseData(firebaseData);

        if (!this.doesKeyExist(key)) {
            return;
        }

        const high = this.internalChange(data, key);
        this.changed().fireAll(high);
    };

    private defaultOnRemoved = async (firebaseData: any) => {
        if (!this.isReady) return;

        const key = firebaseData.key();

        const high = this.internalDelete(key);
        this.removed().fireAll(high);
    };

    public getAllAsArray() {
        return this._all;
    }

    private async internalAddOrChange(data: TLow, key: string, fb: Firebase_Child_T): Promise<THigh | null> {
        return this.doesKeyExist(key)
            ? this.internalChange(data, key)
            : await this.internalAdd(data, key, fb);
    }

    private async internalAdd(data: TLow, key: string, fb: Firebase_Child_T): Promise<THigh> {

        if (!data.id) {
            data.id = key;
        }

        const high = await this._highLevelFactory(data, this.getClient(), fb);

        this._idToIndex[key] = this._all.length;
        this._all.push(high);
        this._byId[key] = high;

        return high;
    }

    private internalChange(data: TLow, key: string): THigh | null {
        const existing = this.getById(key);
        if (!existing) return null;

        existing.updateLowLevelData(data);
        return existing;
    }

    private doesKeyExist(key: string): boolean {
        return this.getById(key) !== undefined;
    }

    private internalDelete(key: string): THigh {
        {
            const idx = this._idToIndex[key];
            if (typeof(idx) === "number") {
                this._all.splice(idx, 1);
            }
        }

        const data = this._byId[key];

        delete this._byId[key];
        delete this._idToIndex[key];

        return data;
    }


    public getAllAsTable(): { [id: string]: THigh } {
        return this._byId;
    }

    public getById = (id: string | null | undefined): THigh | null => {
        if (!id) return null;

        return this._byId[id];
    }
}
