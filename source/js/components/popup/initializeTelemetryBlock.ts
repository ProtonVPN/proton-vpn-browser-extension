'use popup';
import type {Telemetry} from '../../vpn/features/Telemetry';

export const initializeTelemetryBlock = (
	area: HTMLElement,
	telemetryFeature: Telemetry,
) => {
	if (!telemetryFeature.isAvailable()) {
		area
			.querySelectorAll<HTMLDivElement>('.telemetry-block')
			.forEach((block) => {
				block.style.display = 'none';
			});
	}
};
