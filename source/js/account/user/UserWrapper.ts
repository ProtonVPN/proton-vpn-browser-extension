export type UserWrapper<T extends object> = {
	User: T;
};

export type WrappedUser<T extends object> = UserWrapper<T> | T;

export const unwrapUser = <T extends object>(
	input: WrappedUser<T> | undefined,
): T | undefined => (input as UserWrapper<T>)?.User || input;
