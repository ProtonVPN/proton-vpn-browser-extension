export interface PmUserResult {
	User: PmUser;
}

export const isPmUserResult = (result: any): result is PmUserResult =>
	result?.User?.Name !== undefined;

export interface PmUser {
	ID: string;
	Name: string;
	Currency: string;
	Credit: number;
	Type: number;
	CreateTime: number;
	MaxSpace: number;
	MaxUpload: number;
	UsedSpace: number;
	Subscribed: number;
	Services: number;
	MnemonicStatus: number;
	Role: number;
	Private: number;
	Delinquent: number;
	Keys: {
		ID: string;
		Version: number;
		Primary: number;
		RecoverySecret: string | null;
		RecoverySecretSignature: string | null;
		PrivateKey: string;
		Fingerprint: string;
		Active: number;
	}[];
	ToMigrate: number;
	Email: string;
	DisplayName: string;
	Locale?: {
		Locale: string | null;
		HasRegisteredLocale: boolean;
	};
}
