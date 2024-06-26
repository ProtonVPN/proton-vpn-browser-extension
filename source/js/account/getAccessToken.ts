import {readSession} from './readSession';
import {refreshToken} from './refreshToken';

export const getAccessToken = async () => (await readSession())?.accessToken || (await refreshToken())?.accessToken;
