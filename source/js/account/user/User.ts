export interface UserResult {
	Code: number;
	User: User;
}

export const isUserResult = (result: any): result is UserResult => typeof result?.User?.VPN === 'object';

export interface User {
	VPN: {
		Name: string;
		Password: string;
		Groups?: string[];
		Status: number;
		ExpirationTime: number;
		/** The plan name, e.g. "free", "bundlepro2024", "vpn2024", etc. */
		PlanName: string;
		/** Only for translations! Don't use in business logic. Use `PlanName` instead. */
		PlanTitle?: string;
		MaxConnect: number;
		/** *Note: Tier 1 doesn't exist any more, therefor `<2` is equivalent to `free` plan in `PlanName`.* */
		MaxTier: number;
		BrowserExtension?: boolean;
		BrowserExtensionPlan?: string | null;
		NeedConnectionAllocation: boolean;
		BusinessEvents?: boolean;
	},
	Subscribed: number;
	Services: number;
	Delinquent: number;
	HasPaymentMethod: number;
	Credit: number;
	Currency: string;
	Warnings: Array<{
		Code: string;
		Message: string;
	}>;
}
