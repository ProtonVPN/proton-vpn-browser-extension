export const getAuthHeaders = (uid: string, accessToken: string) => ({
	'x-pm-uid': uid,
	Authorization: `Bearer ${accessToken}`,
});
