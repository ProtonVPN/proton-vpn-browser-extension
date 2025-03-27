import ChromeSettingGetResult = chrome.types.ChromeSettingGetResult;

export const getControlledValue = (details?: ChromeSettingGetResult<any>) => {
	const levelOfControl = details?.levelOfControl;
	const isControlledByExtension = (
		levelOfControl === 'controlled_by_this_extension' ||
		levelOfControl === 'controllable_by_this_extension'
	);

	return isControlledByExtension ? details?.value : undefined;
};
