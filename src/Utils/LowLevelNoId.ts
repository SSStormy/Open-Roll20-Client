export type LowLevelNoId<TLow> = Pick<TLow, Exclude<keyof TLow, "id">>
