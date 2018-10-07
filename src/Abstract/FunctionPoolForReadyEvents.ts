import {FunctionPool} from "./FunctionPool";
import {ILogger} from "../Interface/ILogger";
import {IFunctionPool} from "../Interface/IFunctionPool";

export class FunctionPoolForReadyEvents<T> implements IFunctionPool<T> {
    private _pool: FunctionPool<T>;
    private _ready: boolean = false;
    private _purpose: string;
    private _log: ILogger;

    public constructor(purpose: string, log: ILogger) {
        this._pool = new FunctionPool<T>(purpose, log);
        this._purpose = purpose;
        this._log = log;
    }

    public setReady() {
        this._log.debug(`function pool for ready events ${this._purpose}: setting ready`);
        this._ready = true;
    }

    public fireAll(...args: any[]) {
        this._pool.fireAll(args);
    };

    public off(fx: T): void {
        this._pool.off(fx);
    }

    public on(fx: T): void {
        // since we are already ready, call the callback.
        if (this._ready) {
            this._log.debug(`function pool for ready events ${this._purpose}: received an on call when already ready, firing`);
            (<any>fx).apply(null, true);
        }

        this._pool.on(fx);
    }
}
