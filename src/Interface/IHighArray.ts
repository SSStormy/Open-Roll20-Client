export interface IHighArray<THigh> {
    invalidateCache(): void;

    tryRepopulate(): void

    getLocalValues(): THigh[];

    add(obj: THigh): Promise<boolean>;

    remove(obj: THigh): Promise<boolean>;

    clear(): Promise<void>;
}
