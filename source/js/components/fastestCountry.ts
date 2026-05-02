import {connectionAttributes, describeButton} from './connectionButton';
import {via} from './via';
import {c} from '../tools/translate';
import {Feature} from '../vpn/Feature';

export const fastestCountry = (
	secureCoreValue = false,
) => `<div class="country-block">
	<div class="details-box ">
		<div class="details-box-summary connection-button-container">
			<div class="country-header list-item-box">
				<button
					class="flex flex-1 text-left button-light-hover connect-option connect-clickable"
					${describeButton(c('Action: Country-level button').t`Connect to the fastest country`)}
					${connectionAttributes({
						pick: 'fastest',
						[secureCoreValue ? 'requiredFeatures' : 'excludedFeatures']:
							Feature.SECURE_CORE,
					})}
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
						${c('Action').t`Connect`}
					</div>
				</button>
			</div>
		</div>
	</div>
</div>`;
