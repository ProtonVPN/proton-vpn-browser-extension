import {c, msgid} from './translate';
import {getServersCount} from '../vpn/getServersCount';
import {ApiError} from '../api';

const getUnlockSentence = (servers: string, countries: string) => /*
	translator: ${servers} is "1900+ secure servers"
	translator: ${countries} is "60 countries"
	*/c('Error').t`Unlock ${servers} in ${countries}`;

export const getAccessSentence = (servers: string, countries: string) => /*
	translator: ${servers} is "5000 secure servers"
	translator: ${countries} is "63 countries"
	*/c('Error').t`Access over ${servers} in ${countries}`;

export const upsell = async (planName: string, code = 86151): Promise<ApiError> => {
	const {
		Servers: servers,
		Countries: countries,
	} = await getServersCount();

	return {
		httpStatus: 403,
		Code: code,
		Error: c('Error').t`Connect from your browser with ${planName}`,
		Details: {
			Type: 'DeviceLimit',
			Title: c('Error').t`Connect from your browser with ${planName}`,
			Body: [
				{
					Component: 'Feature',
					Icon: 'world',
					Text: getUnlockSentence(
						/**
						 * 	translator: ${servers} is a number so output is like "1900+ secure servers" and this goes in sentence such as "Unlock 1900+ secure servers in 60 countries"
						 */
						c('Error').plural(servers, msgid`${servers}+ secure server`, `${servers}+ secure servers`),
						/**
						 * 	translator: ${countries} is a number so output is like "60 countries" and this goes in sentence such as "Unlock 1900+ secure servers in 60 countries"
						 */
						c('Error').plural(countries, msgid`${countries} country`, `${countries} countries`),
					),
				},
				{
					Component: 'Feature',
					Icon: 'play',
					Text: c('Error').t`Unlock global streaming services`,
				},
				{
					Component: 'Feature',
					Icon: 'incognito',
					Text: c('Error').t`Bypass online censorship with advanced security and privacy features`,
				},
			],
			Actions: [
				{
					Code: 'Upgrade',
					Name: c('Action').t`Upgrade`,
					Category: 'main_action',
					URL: '/vpn/dashboard',
				},
			],
		},
	};
};
