import {ILogger} from "../Interface/ILogger";
import {IFunctionPool} from "../Interface/IFunctionPool";

export class FunctionPool<T> implements IFunctionPool<T> {
    private fxList: T[] = [];
    private _purpose: string;
    private _log: ILogger;

    public constructor(purpose: string, log: ILogger) {
        this._purpose = purpose;
        this._log = log;
    }

    public on(fx: T) {
        this._log.debug(`function pool ${this._purpose}: adding fx`, fx);

        this.fxList.push(fx);
    }

    public off(fx: T) {
        this._log.debug(`function pool ${this._purpose}: removing fx`, fx);

        let idx = this.fxList.length;

        while (idx-- > 0) {
            let cur = this.fxList[idx];
            if (cur === fx) {
                this.fxList.splice(idx, 1);
            }
        }
    }

    public fireAll = (...args: any[]) => {
        this._log.debug(`function pool ${this._purpose}: firing all with args`, args);

        for (const fx of this.fxList) {
            (<any>fx).apply(null, args);
        }
    }
}
