import type {Coordinates} from '../tools/Coordinates';
import {clamp} from '../tools/math';
import {computeDistance} from '../tools/computeDistance';
import {computePenalty} from './computePenalty';

const BANDWITH_DISTANCE_FACTOR = 738_000;

const isLocalizable = (
	location: Partial<Coordinates>,
): location is Coordinates =>
	typeof location.Latitude === 'number' &&
	typeof location.Longitude === 'number';

const normalize = (score: number): number =>
	(BANDWITH_DISTANCE_FACTOR - score) / BANDWITH_DISTANCE_FACTOR;

/** Number of km the signal has to travel from user to exit via the entry */
const computeSignalTravelDistance = (
	entryLocation: Coordinates,
	exitLocation: Coordinates,
	userLocation: Coordinates,
): number =>
	computeDistance(exitLocation, entryLocation) +
	computeDistance(entryLocation, userLocation);

/**
 * Normalized score from 0 (super far from server, low bandwidth)
 * to 1 (close to server, max of the bandwidth available)
 */
const computeDistanceScore = (
	entryLocation: Coordinates,
	exitLocation: Coordinates,
	userLocation: Coordinates,
): number => {
	const distance = computeSignalTravelDistance(
		entryLocation,
		exitLocation,
		userLocation,
	);
	const bandwidth = BANDWITH_DISTANCE_FACTOR / Math.max(1, distance);

	return normalize(bandwidth);
};

const getJitter = (): number => (0.5 - Math.random()) * 0.01;

export const calculateScore = (
	visible: boolean,
	enabled: boolean,
	serverCapacity: number,
	cost: number,
	penalty: number,
	serverCountry: string,
	entryLocation: Coordinates,
	exitLocation: Coordinates,
	userLocation: Partial<Coordinates>,
	userCountry: string | undefined,
): number => {
	const distanceScore = isLocalizable(userLocation)
		? computeDistanceScore(entryLocation, exitLocation, userLocation)
		: 0;
	const cappedScore = Math.max(distanceScore, serverCapacity);

	return (
		clamp(0, cappedScore + getJitter(), 1) +
		computePenalty(
			visible,
			enabled,
			serverCapacity,
			cost,
			penalty,
			serverCountry,
			userCountry,
		)
	);
};
