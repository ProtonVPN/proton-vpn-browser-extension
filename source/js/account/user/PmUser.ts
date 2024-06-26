export interface PmUserResult {
	User: PmUser;
}

export const isPmUserResult = (result: any): result is PmUserResult => !!result?.User?.Name;

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
	Keys: [
		{
			ID: "eeeL5NULQekILIyzijxcVnoVb1ecBlWpX897HTXC82tuHBMWsvprvYuP1jYRFe2E9QpekToaBWfT3gZNNf3Wkg==",
			Version: 3,
			Primary: 1,
			RecoverySecret: null,
			RecoverySecretSignature: null,
			PrivateKey: "-----BEGIN PGP PRIVATE KEY BLOCK-----\nVersion: ProtonMail\n\n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\n219jeHHDdwNAa9QYYMvL49n25A==\n=cjZN\n-----END PGP PRIVATE KEY BLOCK-----\n",
			Fingerprint: "025b8f17f91fad3643240ca9b1c5a4c77c725cac",
			Active: 1
		}
	],
	ToMigrate: number;
	Email: string;
	DisplayName: string;
}