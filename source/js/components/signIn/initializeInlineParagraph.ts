import {c, getNumberFormatter, msgid} from '../../tools/translate';

let serverCount: number | undefined = undefined;
let serverCountLastCheck = 0;
const serverTruncateFactor = 100;

const truncateBy = (number: number, factor: number): number => {
	const truncatedCount = Math.floor(number / factor) * factor;

	return truncatedCount === serverCount
		? truncatedCount - serverTruncateFactor
		: truncatedCount;
};

export const getServerCountLastCheck = () => serverCountLastCheck;

export const setServerCount = (count: number) => {
	serverCount = count;
	serverCountLastCheck = Date.now();
	refreshIncentiveParagraph();
};

const refreshIncentiveParagraph = (area?: HTMLElement) => {
	serverCount || (serverCount = 13_626);

	const truncatedCount = truncateBy(serverCount, serverTruncateFactor);
	const count = getNumberFormatter().format(truncatedCount);

	if (!(area && ('querySelectorAll' in area))) {
		return;
	}

	area.querySelectorAll<HTMLParagraphElement>('.incentive-paragraph').forEach(paragraph => {
		paragraph.innerHTML = c('Info').plural(
			truncatedCount,
			msgid`High performance Swiss VPN that protects your privacy. Maximum security, more than ${count} server and no restrictions.`,
			`High performance Swiss VPN that protects your privacy. Maximum security, more than ${count} servers and no restrictions.`,
		);
	});
};

export const initializeInlineParagraph = (signInView: HTMLElement, paragraph: HTMLElement, hasPartnerOauth: boolean) => {
	if (hasPartnerOauth) {
		paragraph.classList.add('partner-subtitle');
		paragraph.classList.remove('incentive-paragraph');
		paragraph.innerText = c('Info').t`Protect yourself online with Proton's free high‑speed VPN.`;

		return;
	}

	paragraph.classList.add('incentive-paragraph');
	refreshIncentiveParagraph(signInView);
};
