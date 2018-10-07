import {ILogger} from "../Interface/ILogger";

export class NullLogger implements ILogger {
    public static readonly Singleton = new NullLogger();

    critical = (msg: string, ...objs: any[]) => {
    };
    debug = (msg: string, ...objs: any[]) => {
    };
    info = (msg: string, ...objs: any[]) => {
    };
    warning = (msg: string, ...objs: any[]) => {
    };

    private constructor() {

    }
}
