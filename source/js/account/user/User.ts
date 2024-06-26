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
		PlanName: string;
		PlanTitle?: string;
		MaxConnect: number;
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
