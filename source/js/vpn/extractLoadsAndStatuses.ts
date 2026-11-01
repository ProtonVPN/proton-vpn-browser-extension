import type {LogicalLoad} from './Logical';

/**
 * @see https://gitlab.protontech.ch/ProtonVPN/knowledge-base/-/blob/master/API/Status%20file%20format.md?ref_type=heads
 */
const extractLoadAndStatus = (
	status: number,
	load: number,
	serverCapacity: number,
): LogicalLoad => ({
	Enabled: !!(status & 1),
	Visible: !!(status & 2),
	AutoConnectable: !!(status & 4),
	Load: load,
	ServerCapacity: serverCapacity,
});

/**
 * @see https://gitlab.protontech.ch/ProtonVPN/knowledge-base/-/blob/master/API/Status%20file%20format.md?ref_type=heads
 */
export const extractLoadsAndStatuses = (
	binaryData: ArrayBuffer,
): LogicalLoad[] => {
	if (binaryData.byteLength < 4) {
		return [];
	}

	const dataView = new DataView(binaryData, 0);
	const version = dataView.getInt32(0);

	// A file with anything else than 01 00 00 00 as first bytes is to be considered invalid.
	if (version !== 0x01_00_00_00) {
		return [];
	}

	const logicals: LogicalLoad[] = [];

	for (let i = 4; i < binaryData.byteLength; i += 6) {
		try {
			logicals.push(
				extractLoadAndStatus(
					dataView.getUint8(i),
					dataView.getUint8(i + 1),
					dataView.getFloat32(i + 2, true),
				),
			);
		} catch {
			break;
		}
	}

	return logicals;
};
