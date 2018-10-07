import {safeParseToInt} from "../Utils/SafeParseToInt";
import {ICharacterAbilityData} from "../Interface/ICharacterAbilityData";
import {HighLevelIdObject} from "../Abstract/HighLevelIdObject";
import {Firebase_Child_T} from "../Abstract/FirebaseTypes";
import {IAttributeData} from "../Interface/IAttributeData";
import {Roll20Client} from "../Roll20Client";


export class CharacterAbility extends HighLevelIdObject<ICharacterAbilityData> {

    private constructor(lowLevel: IAttributeData, client: Roll20Client, fb: Firebase_Child_T) {
        super(lowLevel, client, fb);
        this.updateLowLevelData(lowLevel);
    }

    public static async fromRaw(rawData: IAttributeData, client: Roll20Client, fb: Firebase_Child_T) {
        return new CharacterAbility(rawData, client, fb);
    }

    public updateLowLevelData(newLow: ICharacterAbilityData): void {
        this.setNewLowLevel(newLow);
    }

    public getAction(): string {
        return this.getLowLevel().action || "";
    }

    public setAction(action: string) {
        return this.setArbitrary("action", action);
    }

    public getDescription(): string {
        return this.getLowLevel().description || "";
    }

    public setDescription(desc: string) {
        return this.setArbitrary("description", desc);
    }

    public getIsTokenAction(): boolean {
        return this.getLowLevel().istokenaction || false;
    }

    public setIsTokenAction(state: boolean) {
        return this.setArbitrary("istokenaction", state);
    }

    public getName(): string {
        return this.getLowLevel().name || "";
    }

    public setName(name: string) {
        return this.setArbitrary("name", name);
    }

    public getOrder(): number {
        return safeParseToInt(this.getLowLevel().order);
    }

    public setOrder(order: number) {
        return this.setArbitrary("order", order);
    }
}
