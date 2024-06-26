import ChromeSettingGetResultDetails = chrome.types.ChromeSettingGetResultDetails;

export const getControlledValue = (details?: ChromeSettingGetResultDetails) => {
	const levelOfControl = details?.levelOfControl;
	const isControlledByExtension = (
		levelOfControl === 'controlled_by_this_extension' ||
		levelOfControl === 'controllable_by_this_extension'
	);

	return isControlledByExtension ? details?.value : undefined;
};
