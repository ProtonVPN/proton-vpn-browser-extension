export const dedupe = <T>(items: T[]): T[] => [...new Set(items)];
