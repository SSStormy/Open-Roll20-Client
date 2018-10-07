export interface IFunctionPool<T> {
    on: (fx: T) => void;
    off: (fx: T) => void;
    fireAll: (...args: any[]) => void;
}
