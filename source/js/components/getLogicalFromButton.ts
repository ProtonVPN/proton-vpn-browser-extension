import type {UserContext} from '../account/user/UserContext';
import type {Logical} from '../vpn/Logical';
import type {Choice} from '../vpn/lastChoice';
import type {Toggle} from '../vpn/features/Toggle';
import type {AllFeatures} from '../vpn/features/AllFeatures';
import type {CountryList} from './countryList';
import {getLogicalById} from '../vpn/getLogicals';
import {Feature} from '../vpn/Feature';
import {
	getAllLogicals,
	requireBestLogical,
	requireRandomLogical,
} from '../vpn/getLogical';
import {filterLogicalsWithCurrentFeatures} from '../vpn/filterLogicalsWithCurrentFeatures';
import type {ApiError} from '../api';
import type {ErrorDump} from '../vpn/ConnectionState';

type HandleableError = ApiError | Error | ErrorDump;

type ButtonDestination = {
	getLogical: () => Logical | null | undefined;
	choice: Omit<Choice, 'connected'>;
};

const getLogicalInExitCountry = (
	button: HTMLButtonElement,
	exitCountry: string,
	features: AllFeatures,
	logicals: Logical[],
	userContext: UserContext,
	baseSecureCoreFilter: Toggle | undefined,
	setError: (error?: HandleableError) => void,
): ButtonDestination => {
	const subGroup = button.getAttribute('data-subGroup') || '';
	const secureCoreFilter =
		baseSecureCoreFilter ??
		(button.hasAttribute('data-no-sc-filter')
			? undefined
			: features.secureCore.config);

	if (subGroup) {
		switch (subGroup.toLowerCase()) {
			case 'other':
				return {
					getLogical: () =>
						requireBestLogical(
							filterLogicalsWithCurrentFeatures(
								logicals.filter(
									(logical) =>
										(logical.Features & Feature.TOR) === 0 &&
										!logical.City &&
										logical.Tier > 0,
								),
								userContext.tier,
								secureCoreFilter,
							),
							userContext,
							setError,
						),
					choice: {
						exitCountry: exitCountry,
						filter: 'other',
					},
				};

			case 'tor':
				return {
					getLogical: () =>
						requireBestLogical(
							filterLogicalsWithCurrentFeatures(
								logicals.filter((logical) => logical.Features & Feature.TOR),
								userContext.tier,
								secureCoreFilter,
								true,
							),
							userContext,
							setError,
						),
					choice: {
						exitCountry: exitCountry,
						requiredFeatures: Feature.TOR,
					},
				};

			case 'free':
				return {
					getLogical: () =>
						requireBestLogical(
							filterLogicalsWithCurrentFeatures(
								logicals.filter((logical) => logical.Tier < 1),
								userContext.tier,
								secureCoreFilter,
							),
							userContext,
							setError,
						),
					choice: {
						exitCountry: exitCountry,
						tier: 0,
					},
				};

			default:
				return {
					getLogical: () =>
						requireBestLogical(
							filterLogicalsWithCurrentFeatures(
								logicals.filter((logical) => logical.City === subGroup),
								userContext.tier,
								secureCoreFilter,
							),
							userContext,
							setError,
						),
					choice: {
						exitCountry: exitCountry,
						city: subGroup,
					},
				};
		}
	}

	const entryCountry = button.getAttribute('data-entryCountry') || '';

	if (entryCountry) {
		return {
			getLogical: () =>
				requireBestLogical(
					filterLogicalsWithCurrentFeatures(
						logicals.filter((logical) => logical.EntryCountry === entryCountry),
						userContext.tier,
						secureCoreFilter,
					),
					userContext,
					setError,
				),
			choice: {
				exitCountry: exitCountry,
				entryCountry: entryCountry,
			},
		};
	}

	return {
		getLogical: () =>
			requireBestLogical(
				filterLogicalsWithCurrentFeatures(
					logicals,
					userContext.tier,
					secureCoreFilter,
				),
				userContext,
				setError,
			),
		choice: {exitCountry: exitCountry},
	};
};

export const getLogicalFromButton = (
	button: HTMLButtonElement,
	countries: CountryList,
	features: AllFeatures,
	userContext: UserContext,
	logicals: Logical[],
	setError: (error?: HandleableError) => void,
): ButtonDestination => {
	const id = button.getAttribute('data-id');

	if (id) {
		return {
			getLogical: () => getLogicalById(id),
			choice: {logicalId: id},
		};
	}

	const exitCountry = button.getAttribute('data-exitCountry') || '';
	const excludedFeatures = Number(
		button.getAttribute('data-excludedFeatures') || 0,
	);
	const requiredFeatures = Number(
		button.getAttribute('data-requiredFeatures') || 0,
	);
	const baseSecureCoreFilter = (() => {
		if (excludedFeatures & Feature.SECURE_CORE) {
			return {value: false};
		}

		if (requiredFeatures & Feature.SECURE_CORE) {
			return {value: true};
		}

		return undefined;
	})();

	if (exitCountry) {
		return getLogicalInExitCountry(
			button,
			exitCountry,
			features,
			getAllLogicals(countries[exitCountry]),
			userContext,
			baseSecureCoreFilter,
			setError,
		);
	}

	const pick = button.getAttribute('data-pick') || '';

	// For now "closest" is not anywhere in the UI, it can redirect to "fastest"
	if (pick === 'fastest' || pick === 'closest') {
		return {
			getLogical: () =>
				requireBestLogical(
					filterLogicalsWithCurrentFeatures(
						logicals.filter((logical) => logical.Tier > 0),
						userContext.tier,
						baseSecureCoreFilter,
					),
					userContext,
					setError,
				),
			choice: {pick},
		};
	}

	if (pick === 'random') {
		return {
			getLogical: () =>
				requireRandomLogical(
					filterLogicalsWithCurrentFeatures(
						logicals.filter((logical) => logical.Tier > 0),
						userContext.tier,
						baseSecureCoreFilter,
					),
					userContext,
					setError,
				),
			choice: {pick},
		};
	}

	return {
		getLogical: () => null,
		choice: {},
	};
};
