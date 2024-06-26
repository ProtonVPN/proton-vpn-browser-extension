export const getKeys = <T>(data: T) => Object.keys(data as object) as (keyof T)[];
