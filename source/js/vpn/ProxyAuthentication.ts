export interface ProxyAuthentication {
	cancel?: boolean;
	authCredentials?: {
		username: string;
		password: string;
	};
}
