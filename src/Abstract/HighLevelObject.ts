import {Firebase_Child_T} from "./FirebaseTypes";
import {Roll20Client} from "../Roll20Client";

export abstract class HighLevelObject<TLow> {
    private lowLevel: TLow;
    private previousLowLevel: TLow | null = null;
    private client: Roll20Client;
    private firebase: Firebase_Child_T;

    public constructor(lowLevel: TLow, client: Roll20Client, fb: Firebase_Child_T) {
        this.client = client;
        this.firebase = fb;
    }

    public destroy() {
        return this.firebase.remove();
    }

    public getFirebase() {
        return this.firebase;
    }

    protected setNewLowLevel(newLow: TLow) {
        this.previousLowLevel = this.lowLevel;
        this.lowLevel = newLow;
    }

    public abstract updateLowLevelData(newLow: TLow): void;

    public getClient() {
        return this.client
    }

    public getLowLevel() {
        return this.lowLevel;
    }

    public getPreviousLowLevel(): TLow | null {
        return this.previousLowLevel;
    }

    public getArbitrary(varName: string): any {
        return (<any>this.getLowLevel())[varName];
    }

    public setArbitrary(varName: string, data: any) {
        return new Promise((ok, err) => {
            this.getFirebase().child(varName).set(data, (e: any) => {
                if (e) {
                    err(e);
                    return;
                }
                ok();
            });
        });
    }
}
