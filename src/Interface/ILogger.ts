export interface ILogger {
    debug: (msg: string, ...objs: any[]) => void;
    info: (msg: string, ...objs: any[]) => void;
    warning: (msg: string, ...objs: any[]) => void;
    critical: (msg: string, ...objs: any[]) => void;
}
