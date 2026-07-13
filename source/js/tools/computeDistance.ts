import type {Coordinates} from '../tools/Coordinates';

/** Convert degrees into radian angleInDegrees * (Math.PI / 180) */
const degToRad = (deg: number): number => deg * 0.017453292519943295;

/** Return distance in km from a latitude/longitude location to another */
export const computeDistance = (
	from: Coordinates,
	to: Coordinates,
	earthRadius = 6_371, // km
): number => {
	const latFrom = degToRad(from.Latitude);
	const lonFrom = degToRad(from.Longitude);
	const latTo = degToRad(to.Latitude);
	const lonTo = degToRad(to.Longitude);

	return (
		earthRadius *
		2 *
		Math.asin(
			Math.sqrt(
				Math.sin((latTo - latFrom) / 2) ** 2 +
					Math.cos(latFrom) *
						Math.cos(latTo) *
						Math.sin((lonTo - lonFrom) / 2) ** 2,
			),
		)
	);
};
