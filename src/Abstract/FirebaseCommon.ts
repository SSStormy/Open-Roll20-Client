import {FunctionPool} from "./FunctionPool";
import {Firebase_Child_T} from "./FirebaseTypes";
import {ILogger} from "../Interface/ILogger";
import {FunctionPoolForReadyEvents} from "./FunctionPoolForReadyEvents";
import {Roll20Client} from "../Roll20Client";

export abstract class FirebaseCommon<THigh, TLow, TInitial> {
    private _client: Roll20Client;
    private _url: string;
    private _firebase: Firebase_Child_T;

    private _addedEvent: FunctionPool<(data: THigh) => Promise<void>>;
    private _changedEvent: FunctionPool<(data: THigh) => Promise<void>>;
    private _removedEvent: FunctionPool<(data: THigh) => Promise<void>>;
    private _readyEvent: FunctionPoolForReadyEvents<(data: TInitial) => Promise<void>>;

    private _readyPromise: Promise<void>;
    private _isReadyYet: boolean = false;

    protected _log: ILogger;
    protected _purpose: string;

    public constructor(client: Roll20Client, url: string, purpose: string) {
        this._log = client.getLogger();
        this._purpose = purpose;

        this._log.debug(`Creating firebase common for ${purpose} at url ${url}`);

        this._addedEvent = new FunctionPool(purpose, this._log);
        this._changedEvent = new FunctionPool(purpose, this._log);
        this._removedEvent = new FunctionPool(purpose, this._log);
        this._readyEvent = new FunctionPoolForReadyEvents(purpose, this._log);

        this._client = client;
        this._url = url;
        this._firebase = client.getFirebase().child(url);

        this._readyPromise = new Promise(ok => this.ready().on(async () => {
            this._log.info(`Firebase common ${purpose} ${url}: is ready`);
            ok();
            this._log.debug(`Firebase common ${purpose} ${url}: ready events fired.`);
        }));

        this._firebase.once("value", this.internalInit);
    }

    private internalInit = async (firebaseData: any) => {
        this._log.debug(`Firebase common ${this._purpose} ${this._url}: received initial data.`, firebaseData);

        const data: TInitial = firebaseData.val();

        await this.initData(data);

        if (!this.isReady()) {
            this._isReadyYet = true;
            this.ready().setReady();
            this._readyEvent.fireAll();
        }
    };

    protected abstract async initData(data: TInitial): Promise<void>;

    public isReady() {
        return this._isReadyYet;
    }

    public getReadyPromise() {
        return this._readyPromise;
    }

    public ready() {
        return this._readyEvent;
    }

    public added() {
        return this._addedEvent;
    };

    public changed() {
        return this._changedEvent;
    }

    public removed() {
        return this._removedEvent;
    }

    public getClient() {
        return this._client;
    }

    public getFirebase() {
        return this._firebase;
    }

    public getURL() {
        return this._url;
    }
}
