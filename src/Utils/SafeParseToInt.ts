export const safeParseToInt = (val: any) => {
    const type = typeof(val);
    if (type === "number") return val;
    if (type === "string") return parseInt(val, 10);
    return NaN;
};


