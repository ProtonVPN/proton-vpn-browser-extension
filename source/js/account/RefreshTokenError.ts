export class RefreshTokenError {
	constructor(
		public readonly message?: string,
		public readonly logout = true,
	) {
		if (!this.message) {
			this.message = 'Missing refresh token';
		}
	}
}
