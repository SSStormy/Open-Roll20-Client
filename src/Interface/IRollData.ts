export interface IRollData {
    dice?: number;
    results?: {
        dice?: number;
        results?: { [id: string]: number };
        sides?: number;
        type?: string;
    };
    sides?: number;
    type?: string;
}
