import {FirebaseCommon} from "./FirebaseCommon";
import {Firebase_Child_T} from "./FirebaseTypes";
import {Roll20Client} from "../Roll20Client";


export class FirebaseVar<THigh> extends FirebaseCommon<THigh, string, string> {

    private _cache: THigh | null = null;
    private _highLevelFactory: (a: string, b: Roll20Client, fb: Firebase_Child_T) => Promise<THigh>;

    public constructor(client: Roll20Client,
                       url: string,
                       factory: (a: string, b: Roll20Client, fb: Firebase_Child_T) => Promise<THigh>,
                       purpose: string) {

        super(client, url, purpose);
        this._highLevelFactory = factory;
    }

    public get(): THigh | null {
        return this._cache;
    }

    public set(data: string) {
        this.getFirebase().set(data);
    }

    protected async initData(data: string): Promise<void> {
        this._cache = await this._highLevelFactory(data, this.getClient(), this.getFirebase());
    }
}
