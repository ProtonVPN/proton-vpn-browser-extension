import {connectionAttributes, describeButton} from './connectionButton';
import {upgradeButton} from './upgradeButton';
import {via} from './via';
import {c} from '../tools/translate';
import {Feature} from '../vpn/Feature';
import {paidOnly, simplifiedUi} from '../config';
import {upgradeAttributes} from '../account/upgradeAttributes';

export const fastestCountry = (userTier: number, secureCoreValue = false) => {
	// Picks among paid servers only, so same as country options for free users
	const canConnect = userTier > 0;
	const grayOutButton = simplifiedUi && !canConnect;

	return `<div class="country-block">
		<div class="details-box ">
			<div class="details-box-summary connection-button-container">
				<div class="country-header list-item-box${grayOutButton ? ' gray-out' : ''}">
					<button
						class="flex flex-1 text-left button-light-hover connect-option${canConnect ? ' connect-clickable' : ''}"
						${describeButton(c('Action: Country-level button').t`Connect to the fastest country`)}
						${
							canConnect
								? connectionAttributes({
										pick: 'fastest',
										[secureCoreValue ? 'requiredFeatures' : 'excludedFeatures']:
											Feature.SECURE_CORE,
									})
								: upgradeAttributes
						}
					>
						${secureCoreValue ? `<div class="via-box">${via()}</div>` : ''}
						<div class="lightning">
							<svg class="lightning-symbol" viewBox="0 0 10 14">
								<use xlink:href="img/icons.svg#lightning"></use>
							</svg>
						</div>
						<div class="flex-1 group-name recent-name">
							${c('Title').t`Fastest country`}
						</div>
						<div class="flex-1 connect-text">
							${canConnect ? c('Action').t`Connect` : ''}
						</div>
					</button>
					${
						!canConnect && (simplifiedUi || !paidOnly)
							? `<div class="button-box">${upgradeButton()}</div>`
							: ''
					}
				</div>
			</div>
		</div>
	</div>`;
};
