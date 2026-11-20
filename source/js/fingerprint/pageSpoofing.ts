/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
import type {SpoofedProfile} from './SpoofedProfile';

/**
 * ⚠ installSpoofing runs in the page (MAIN world, see fingerprint.ts) and
 * tests serialize it to run it in a separate realm, so it must be fully
 * self-contained:
 * - no import, no reference to anything outside the function,
 * - no syntax TypeScript would compile into a helper (object spread,
 *   async/await, etc.).
 */

/**
 * Install the spoofing in the current frame (and same-origin frames it
 * creates), or update it when already installed.
 *
 * Every getter/method keeps calling the native one first (so errors and
 * edge cases remain native), then the spoofed value is returned only if
 * the group is in the current profile, so updating the profile to null
 * restores real values.
 */
export function installSpoofing(
	profile: SpoofedProfile | null,
	channel: string,
): void {
	const updateProbe = {profile, installed: false};

	try {
		window.dispatchEvent(new CustomEvent(channel, {detail: updateProbe}));
	} catch {
		// Not installed
	}

	if (updateProbe.installed || !profile) {
		return;
	}

	const state = {profile: profile as SpoofedProfile | null};
	/** Native-looking source of each replaced function, for all realms */
	const nativeSources = new WeakMap<object, string>();
	/** One entry per realm (its Object constructor) already handled */
	const installedRealms = new WeakSet<object>();
	const getOwnDescriptor = Object.getOwnPropertyDescriptor;
	const defineProperty = Object.defineProperty;
	const getPrototypeOf = Object.getPrototypeOf;
	const functionToString = Function.prototype.toString;

	const current = (): SpoofedProfile => state.profile || {};
	// Assigned below, used by installFrames for child frames
	let install: (w: any) => void = () => undefined;

	const findDescriptor = (
		target: any,
		name: string,
	): [any, PropertyDescriptor] | undefined => {
		for (let owner = target; owner; owner = getPrototypeOf(owner)) {
			const descriptor = getOwnDescriptor(owner, name);

			if (descriptor) {
				return [owner, descriptor];
			}
		}

		return undefined;
	};

	/** Make a replacement look like the original: name, length, source */
	const disguise = (replacement: any, original: any) => {
		try {
			defineProperty(replacement, 'name', {value: original.name});
			defineProperty(replacement, 'length', {value: original.length});
			nativeSources.set(replacement, functionToString.call(original));
		} catch {
			// Best effort
		}

		return replacement;
	};

	/**
	 * Replace an accessor, compute() receives the real value and returns
	 * the spoofed one or undefined to keep the real one.
	 */
	const replaceGetter = (
		target: any,
		name: string,
		compute: (real: any, self: any) => any,
	) => {
		const found = target && findDescriptor(target, name);

		if (!found || !found[1].get || !found[1].configurable) {
			return;
		}

		const [owner, descriptor] = found;
		const originalGet = descriptor.get as () => any;
		// Accessor syntax gives the native-like "get <name>" function name
		const replacement = getOwnDescriptor(
			{
				get [name]() {
					const real = originalGet.call(this);
					const spoofed = compute(real, this);

					return spoofed === undefined ? real : spoofed;
				},
			},
			name,
		)!.get;
		disguise(replacement, originalGet);
		defineProperty(owner, name, {
			get: replacement,
			set: descriptor.set,
			enumerable: descriptor.enumerable,
			configurable: true,
		});
	};

	/** Replace a method, the factory receives the original method */
	const replaceMethod = (
		target: any,
		name: string,
		factory: (original: (...args: any[]) => any) => (...args: any[]) => any,
	) => {
		const descriptor = target && getOwnDescriptor(target, name);

		if (!descriptor || typeof descriptor.value !== 'function') {
			return;
		}

		const replacement = disguise(factory(descriptor.value), descriptor.value);
		defineProperty(target, name, {
			value: replacement,
			writable: descriptor.writable,
			enumerable: descriptor.enumerable,
			configurable: descriptor.configurable,
		});
	};

	const installToString = (w: any) => {
		const original = w.Function.prototype.toString;
		const replacement = {
			toString(this: any) {
				const source = nativeSources.get(this);

				return typeof source === 'string' ? source : original.call(this);
			},
		}.toString;
		disguise(replacement, original);
		defineProperty(w.Function.prototype, 'toString', {
			value: replacement,
			writable: true,
			enumerable: false,
			configurable: true,
		});
	};

	const installNavigator = (w: any) => {
		const navigator = w.navigator;
		const frozenLists = new WeakMap<object, readonly string[]>();
		const agent = () => current().userAgent;
		const hardware = () => current().hardware;

		replaceGetter(navigator, 'userAgent', () => agent()?.userAgent);
		replaceGetter(navigator, 'appVersion', () => agent()?.appVersion);
		replaceGetter(navigator, 'platform', () => agent()?.platform);
		replaceGetter(navigator, 'oscpu', () => agent()?.oscpu);
		replaceGetter(
			navigator,
			'hardwareConcurrency',
			() => hardware()?.hardwareConcurrency,
		);
		replaceGetter(navigator, 'deviceMemory', () => hardware()?.deviceMemory);
		replaceGetter(navigator, 'language', () => current().language?.language);
		replaceGetter(navigator, 'languages', () => {
			const language = current().language;

			if (!language) {
				return undefined;
			}

			// Same object on each call, like the native one
			let list = frozenLists.get(language);

			if (!list) {
				list = w.Object.freeze(w.Array.from(language.languages));
				frozenLists.set(language, list!);
			}

			return list;
		});

		// Chromium User-Agent Client Hints
		const uaData = w.NavigatorUAData?.prototype;
		const hints = () => agent()?.clientHints;

		replaceGetter(uaData, 'platform', () => hints()?.platform);
		replaceMethod(
			uaData,
			'getHighEntropyValues',
			(original) =>
				function (this: any) {
					return original.apply(this, arguments as any).then((values: any) => {
						const clientHints = hints();

						if (!clientHints) {
							return values;
						}

						const keys = [
							'platform',
							'platformVersion',
							'architecture',
							'bitness',
						];

						for (let i = 0; i < keys.length; i++) {
							const key = keys[i]!;

							if (key in values) {
								values[key] = (clientHints as any)[key];
							}
						}

						if ('model' in values) {
							values.model = '';
						}

						return values;
					});
				},
		);
		replaceMethod(
			uaData,
			'toJSON',
			(original) =>
				function (this: any) {
					const json = original.apply(this, arguments as any);
					const clientHints = hints();

					if (clientHints && json && 'platform' in json) {
						json.platform = clientHints.platform;
					}

					return json;
				},
		);
	};

	const installScreen = (w: any) => {
		const screen = () => current().screen;
		const screenProperties = [
			'width',
			'height',
			'availWidth',
			'availHeight',
			'colorDepth',
			'pixelDepth',
		] as const;

		for (let i = 0; i < screenProperties.length; i++) {
			const name = screenProperties[i]!;
			replaceGetter(w.screen, name, () => screen()?.[name]);
		}

		replaceGetter(w.screen, 'availLeft', () => (screen() ? 0 : undefined));
		replaceGetter(w.screen, 'availTop', () => (screen() ? 0 : undefined));
		// Single screen
		replaceGetter(w.screen, 'isExtended', () => (screen() ? false : undefined));
		replaceGetter(w, 'devicePixelRatio', () => screen()?.devicePixelRatio);
		// The window can't be bigger than the screen, nor be on another screen
		replaceGetter(w, 'outerWidth', (real: number) => {
			const value = screen();

			return value ? Math.min(real, value.availWidth) : undefined;
		});
		replaceGetter(w, 'outerHeight', (real: number) => {
			const value = screen();

			return value ? Math.min(real, value.availHeight) : undefined;
		});
		const clamp = (real: number, max: number) =>
			Math.max(0, Math.min(real, max));
		const horizontal = (real: number) => {
			const value = screen();

			return value
				? clamp(
						real,
						value.availWidth - Math.min(w.outerWidth, value.availWidth),
					)
				: undefined;
		};
		const vertical = (real: number) => {
			const value = screen();

			return value
				? clamp(
						real,
						value.availHeight - Math.min(w.outerHeight, value.availHeight),
					)
				: undefined;
		};
		replaceGetter(w, 'screenX', horizontal);
		replaceGetter(w, 'screenLeft', horizontal);
		replaceGetter(w, 'screenY', vertical);
		replaceGetter(w, 'screenTop', vertical);

		// Window Management API would list all screens, behave as if the
		// permission was denied (what happens most of the time)
		replaceMethod(
			w,
			'getScreenDetails',
			(original) =>
				function (this: any) {
					if (!screen()) {
						return original.apply(this, arguments as any);
					}

					return w.Promise.reject(
						new w.DOMException('Permission denied.', 'NotAllowedError'),
					);
				},
		);
	};

	/**
	 * Graphics card as exposed by WebGL (debug renderer info, and the plain
	 * VENDOR/RENDERER when the browser puts the real card there too) and
	 * by WebGPU adapter info.
	 */
	const installWebgl = (w: any) => {
		const webgl = () => current().webgl;
		const unmaskedVendor = 0x9245;
		const unmaskedRenderer = 0x9246;
		const vendorParameter = 0x1f00;
		const rendererParameter = 0x1f01;
		// Values that don't reveal the card, kept as is
		const generic = ['WebKit', 'WebKit WebGL', 'Mozilla'];
		const contexts = [w.WebGLRenderingContext, w.WebGL2RenderingContext];

		for (let i = 0; i < contexts.length; i++) {
			replaceMethod(
				contexts[i]?.prototype,
				'getParameter',
				(original) =>
					function (this: any, name: unknown) {
						const real = original.apply(this, arguments as any);
						const value = webgl();

						// null when the extension is not enabled, keep it native
						if (!value || typeof real !== 'string') {
							return real;
						}

						switch (name) {
							case unmaskedVendor:
								return value.vendor;

							case unmaskedRenderer:
								return value.renderer;

							case vendorParameter:
								return generic.indexOf(real) === -1 ? value.vendor : real;

							case rendererParameter:
								return generic.indexOf(real) === -1 ? value.renderer : real;
						}

						return real;
					},
			);
		}

		const adapterInfo = w.GPUAdapterInfo?.prototype;
		const gpu = () => webgl()?.gpu;

		replaceGetter(adapterInfo, 'vendor', () => gpu()?.vendor);
		replaceGetter(adapterInfo, 'architecture', () => gpu()?.architecture);
		replaceGetter(adapterInfo, 'device', () => (gpu() ? '' : undefined));
		replaceGetter(adapterInfo, 'description', () => (gpu() ? '' : undefined));
	};

	/**
	 * Canvas pixels depend on the GPU, drivers and fonts, there is no common
	 * value to blend in with, so instead each reading gets a faint noise
	 * (±1 on one channel of ~3% of the visible pixels): invisible, but the
	 * hash differs per site and per connection, so it can't link visits.
	 *
	 * The noise only depends on the seed, the origin, the pixel position and
	 * its color: reading the same image twice gives the same result (a
	 * changing value would reveal the spoofing), and fully transparent
	 * pixels are never changed (a blank canvas stays blank).
	 */
	const installCanvas = (w: any) => {
		const imul = Math.imul;
		const mix = (a: number, b: number) => {
			let hash = imul(a ^ b, 0x9e3779b1);
			hash ^= hash >>> 15;
			hash = imul(hash, 0x85ebca6b);
			hash ^= hash >>> 13;
			hash = imul(hash, 0xc2b2ae35);

			return (hash ^ (hash >>> 16)) >>> 0;
		};
		let originHash = 0x811c9dc5;

		try {
			const origin = String(w.location.origin);

			for (let i = 0; i < origin.length; i++) {
				originHash = imul(originHash ^ origin.charCodeAt(i), 0x01000193);
			}
		} catch {
			// No origin: seed only
		}

		const getSeed = (): number | undefined => {
			const canvas = current().canvas;

			return canvas ? mix(canvas.seed, originHash) : undefined;
		};

		/** Add noise to pixels read at (left, top) of a canvasWidth wide canvas */
		const addNoise = (
			data: Uint8ClampedArray,
			left: number,
			top: number,
			width: number,
			canvasWidth: number,
			seed: number,
		) => {
			for (let i = 0; i + 3 < data.length; i += 4) {
				const alpha = data[i + 3]!;

				if (!alpha) {
					continue;
				}

				const pixel = i / 4;
				const position =
					(top + Math.floor(pixel / width)) * canvasWidth +
					left +
					(pixel % width);
				const hash = mix(
					mix(seed, position),
					data[i]! | (data[i + 1]! << 8) | (data[i + 2]! << 16) | (alpha << 24),
				);

				if (hash & 31) {
					continue;
				}

				const channel = i + ((hash >>> 5) % 3);
				const delta = hash & 0x100 ? 1 : -1;
				const value = data[channel]! + delta;
				data[channel] = value < 0 || value > 255 ? value - 2 * delta : value;
			}
		};

		const contexts = [
			w.CanvasRenderingContext2D?.prototype,
			w.OffscreenCanvasRenderingContext2D?.prototype,
		];
		/** Native getImageData of each context type, before replacement */
		const nativeGetImageData = new Map<any, (...args: any[]) => any>();

		for (let i = 0; i < contexts.length; i++) {
			const proto = contexts[i];

			replaceMethod(proto, 'getImageData', (original) => {
				nativeGetImageData.set(proto, original);

				return function (this: any, x: unknown, y: unknown, width: unknown) {
					const image = original.apply(this, arguments as any);
					const seed = getSeed();

					if (seed !== undefined && image?.data) {
						// A negative width reads leftward from x
						const left =
							Math.trunc(Number(x)) + Math.min(0, Math.trunc(Number(width)));
						addNoise(
							image.data,
							left,
							Math.trunc(Number(y)),
							image.width,
							this.canvas.width,
							seed,
						);
					}

					return image;
				};
			});
		}

		/** Noisy 2D copy of the canvas, or undefined to use the canvas itself */
		const getNoisyCopy = (source: any, offscreen: boolean): any => {
			const seed = getSeed();
			const width = source.width;
			const height = source.height;

			if (seed === undefined || !width || !height) {
				return undefined;
			}

			const copy = offscreen
				? new w.OffscreenCanvas(width, height)
				: w.document.createElement('canvas');
			copy.width = width;
			copy.height = height;
			const context = copy.getContext('2d');
			const getImageData = nativeGetImageData.get(getPrototypeOf(context));

			if (!getImageData) {
				return undefined;
			}

			context.drawImage(source, 0, 0);
			// Throws for a tainted canvas: the original then throws natively
			const image = getImageData.call(context, 0, 0, width, height);
			addNoise(image.data, 0, 0, width, width, seed);
			context.putImageData(image, 0, 0);

			return copy;
		};

		const exports: [any, string, boolean][] = [
			[w.HTMLCanvasElement?.prototype, 'toDataURL', false],
			[w.HTMLCanvasElement?.prototype, 'toBlob', false],
			[w.OffscreenCanvas?.prototype, 'convertToBlob', true],
		];

		for (let i = 0; i < exports.length; i++) {
			const [target, name, offscreen] = exports[i]!;

			replaceMethod(
				target,
				name,
				(original) =>
					function (this: any) {
						let copy: any;

						try {
							copy = getNoisyCopy(this, offscreen);
						} catch {
							// Tainted or unsupported: native behavior
						}

						return original.apply(copy || this, arguments as any);
					},
			);
		}
	};

	const installTimezone = (w: any) => {
		const OriginalDate = w.Date;
		const OriginalDateTimeFormat = w.Intl.DateTimeFormat;
		const proto = OriginalDate.prototype;
		const getTime = proto.getTime;
		const setTime = proto.setTime;
		const setUTCFullYear = proto.setUTCFullYear;
		const setUTCHours = proto.setUTCHours;
		const realLocal = {
			year: proto.getFullYear,
			month: proto.getMonth,
			day: proto.getDate,
			hour: proto.getHours,
			minute: proto.getMinutes,
			second: proto.getSeconds,
			millisecond: proto.getMilliseconds,
		};
		const originalParse = OriginalDate.parse;
		const formatters: Record<string, any> = {};
		const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const months = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		let lastParts: {key: string; fields: number[]} | undefined;

		const timezone = () => current().timezone;

		/** [year, month, day, hour, minute, second, millisecond, weekday] */
		const getFields = (time: number, zone: string): number[] => {
			const key = zone + ':' + time;

			if (lastParts?.key === key) {
				return lastParts.fields;
			}

			const formatter =
				formatters[zone] ||
				(formatters[zone] = new OriginalDateTimeFormat('en-US', {
					timeZone: zone,
					hourCycle: 'h23',
					era: 'short',
					year: 'numeric',
					month: 'numeric',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					second: 'numeric',
					weekday: 'short',
				}));
			const parts = formatter.formatToParts(time);
			const values: Record<string, string> = {};

			for (let i = 0; i < parts.length; i++) {
				values[parts[i].type] = parts[i].value;
			}

			const year = Number(values['year']);
			const fields = [
				values['era'] === 'BC' ? 1 - year : year,
				Number(values['month']) - 1,
				Number(values['day']),
				Number(values['hour']) % 24,
				Number(values['minute']),
				Number(values['second']),
				((time % 1000) + 1000) % 1000,
				weekdays.indexOf(values['weekday'] as string),
			];
			lastParts = {key, fields};

			return fields;
		};

		const utc = (fields: number[]): number => {
			const date = new OriginalDate(0);
			setUTCFullYear.call(date, fields[0], fields[1], fields[2]);
			setUTCHours.call(date, fields[3], fields[4], fields[5], fields[6]);

			return getTime.call(date);
		};

		/** Minutes to add to UTC to get the local time (UTC+1 => 60) */
		const offsetAt = (time: number, zone: string): number => {
			const wholeSeconds = Math.floor(time / 1000) * 1000;
			const fields = getFields(wholeSeconds, zone).slice(0, 7);
			fields[6] = 0;

			return Math.round((utc(fields) - wholeSeconds) / 60_000);
		};

		/** Local time fields in the zone to timestamp */
		const fromLocal = (fields: number[], zone: string): number => {
			const local = utc(fields);

			if (local !== local) {
				return NaN;
			}

			const firstGuess = local - offsetAt(local, zone) * 60_000;

			return local - offsetAt(firstGuess, zone) * 60_000;
		};

		const pad = (value: number, length = 2) => {
			let text = String(Math.abs(value));

			while (text.length < length) {
				text = '0' + text;
			}

			return text;
		};

		const formatDate = (fields: number[]) =>
			weekdays[fields[7]!] +
			' ' +
			months[fields[1]!] +
			' ' +
			pad(fields[2]!) +
			' ' +
			(fields[0]! < 0 ? '-' + pad(fields[0]!, 6) : pad(fields[0]!, 4));

		const formatTime = (time: number, fields: number[], zone: string) => {
			const offset = offsetAt(time, zone);
			let name = '';

			try {
				const language = current().language?.language;
				const parts = new OriginalDateTimeFormat(language, {
					timeZone: zone,
					timeZoneName: 'long',
				}).formatToParts(time);

				for (let i = 0; i < parts.length; i++) {
					if (parts[i].type === 'timeZoneName') {
						name = ' (' + parts[i].value + ')';
					}
				}
			} catch {
				// No name
			}

			return (
				pad(fields[3]!) +
				':' +
				pad(fields[4]!) +
				':' +
				pad(fields[5]!) +
				' GMT' +
				(offset < 0 ? '-' : '+') +
				pad(Math.floor(Math.abs(offset) / 60)) +
				pad(Math.abs(offset) % 60) +
				name
			);
		};

		// Local getters
		const getters: [string, (fields: number[]) => number][] = [
			['getFullYear', (fields) => fields[0]!],
			['getYear', (fields) => fields[0]! - 1900],
			['getMonth', (fields) => fields[1]!],
			['getDate', (fields) => fields[2]!],
			['getHours', (fields) => fields[3]!],
			['getMinutes', (fields) => fields[4]!],
			['getSeconds', (fields) => fields[5]!],
			['getDay', (fields) => fields[7]!],
		];

		for (let i = 0; i < getters.length; i++) {
			const [name, pick] = getters[i]!;
			replaceMethod(
				proto,
				name,
				(original) =>
					function (this: any) {
						const time = getTime.call(this);
						const zone = timezone();

						return !zone || time !== time
							? original.call(this)
							: pick(getFields(time, zone));
					},
			);
		}

		replaceMethod(
			proto,
			'getTimezoneOffset',
			(original) =>
				function (this: any) {
					const time = getTime.call(this);
					const zone = timezone();

					// + 0 turns -0 into 0
					return !zone || time !== time
						? original.call(this)
						: -offsetAt(time, zone) + 0;
				},
		);

		// Local setters: [name, index of the first field set, max arguments]
		const setters: [string, number, number][] = [
			['setFullYear', 0, 3],
			['setMonth', 1, 2],
			['setDate', 2, 1],
			['setHours', 3, 4],
			['setMinutes', 4, 3],
			['setSeconds', 5, 2],
		];

		for (let i = 0; i < setters.length; i++) {
			const [name, start, max] = setters[i]!;
			replaceMethod(
				proto,
				name,
				(original) =>
					function (this: any) {
						let time = getTime.call(this);
						const zone = timezone();

						if (!zone) {
							return original.apply(this, arguments as any);
						}

						if (time !== time) {
							if (name !== 'setFullYear') {
								return time;
							}

							// Invalid date: setFullYear starts from local 1970-01-01
							time = fromLocal([1970, 0, 1, 0, 0, 0, 0], zone);
						}

						const fields = getFields(time, zone).slice(0, 7);
						const count = Math.max(1, Math.min(arguments.length, max));

						for (let index = 0; index < count; index++) {
							fields[start + index] = Number(arguments[index]);
						}

						return setTime.call(this, fromLocal(fields, zone));
					},
			);
		}

		// String representations
		replaceMethod(
			proto,
			'toString',
			(original) =>
				function (this: any) {
					const time = getTime.call(this);
					const zone = timezone();

					if (!zone || time !== time) {
						return original.call(this);
					}

					const fields = getFields(time, zone);

					return formatDate(fields) + ' ' + formatTime(time, fields, zone);
				},
		);
		replaceMethod(
			proto,
			'toDateString',
			(original) =>
				function (this: any) {
					const time = getTime.call(this);
					const zone = timezone();

					return !zone || time !== time
						? original.call(this)
						: formatDate(getFields(time, zone));
				},
		);
		replaceMethod(
			proto,
			'toTimeString',
			(original) =>
				function (this: any) {
					const time = getTime.call(this);
					const zone = timezone();

					return !zone || time !== time
						? original.call(this)
						: formatTime(time, getFields(time, zone), zone);
				},
		);

		/** Strings with an explicit zone, or date-only ISO strings (UTC) */
		const hasExplicitZone = (text: string) =>
			/^\s*[+-]?\d{4,6}(-\d\d(-\d\d)?)?\s*$/.test(text) ||
			/(Z|[+-]\d\d:?\d\d)\s*$/i.test(text) ||
			/\b(GMT|UTC|UT|[ECMP][SD]T)\b/i.test(text);

		/** Re-interpret local date strings in the spoofed timezone */
		const parse = (text: string, zone: string) => {
			const time = originalParse(text);

			if (time !== time || hasExplicitZone(text)) {
				return time;
			}

			const real = new OriginalDate(time);

			return fromLocal(
				[
					realLocal.year.call(real),
					realLocal.month.call(real),
					realLocal.day.call(real),
					realLocal.hour.call(real),
					realLocal.minute.call(real),
					realLocal.second.call(real),
					realLocal.millisecond.call(real),
				],
				zone,
			);
		};

		const DateReplacement = disguise(
			{
				Date: function (this: any) {
					const zone = timezone();
					const count = arguments.length;

					if (!new.target) {
						// Date() called as a function returns now as a string
						return new OriginalDate().toString();
					}

					if (zone && count >= 2) {
						const fields: number[] = [];

						for (let i = 0; i < 7; i++) {
							fields[i] = i < count ? Number(arguments[i]) : i === 2 ? 1 : 0;
						}

						const year = Math.trunc(fields[0]!);

						if (year >= 0 && year <= 99) {
							fields[0] = 1900 + year;
						}

						return Reflect.construct(
							OriginalDate,
							[fromLocal(fields, zone)],
							new.target,
						);
					}

					if (zone && count === 1 && typeof arguments[0] === 'string') {
						return Reflect.construct(
							OriginalDate,
							[parse(arguments[0], zone)],
							new.target,
						);
					}

					return Reflect.construct(
						OriginalDate,
						Array.prototype.slice.call(arguments),
						new.target,
					);
				},
			}.Date,
			OriginalDate,
		);
		const parseReplacement = disguise(
			{
				parse(text: unknown) {
					const zone = timezone();

					return zone ? parse(String(text), zone) : originalParse(text);
				},
			}.parse,
			originalParse,
		);
		defineProperty(DateReplacement, 'prototype', {
			value: proto,
			writable: false,
			enumerable: false,
			configurable: false,
		});
		defineProperty(DateReplacement, 'now', {
			value: OriginalDate.now,
			writable: true,
			configurable: true,
		});
		defineProperty(DateReplacement, 'UTC', {
			value: OriginalDate.UTC,
			writable: true,
			configurable: true,
		});
		defineProperty(DateReplacement, 'parse', {
			value: parseReplacement,
			writable: true,
			configurable: true,
		});
		defineProperty(proto, 'constructor', {
			value: DateReplacement,
			writable: true,
			configurable: true,
		});
		defineProperty(w, 'Date', {
			value: DateReplacement,
			writable: true,
			configurable: true,
		});

		// Temporal (when available)
		const now = w.Temporal?.Now;
		replaceMethod(
			now,
			'timeZoneId',
			(original) =>
				function (this: any) {
					return timezone() || original.apply(this, arguments as any);
				},
		);
		const temporalNowMethods = [
			'plainDateTimeISO',
			'plainDateISO',
			'plainTimeISO',
			'zonedDateTimeISO',
		];

		for (let i = 0; i < temporalNowMethods.length; i++) {
			replaceMethod(
				now,
				temporalNowMethods[i]!,
				(original) =>
					function (this: any, zone?: unknown) {
						return original.call(this, zone === undefined ? timezone() : zone);
					},
			);
		}
	};

	/**
	 * Default locale (language group) and default timezone (timezone group)
	 * of Intl and toLocale*String methods.
	 */
	const installLocale = (w: any) => {
		const withDefaults = (args: ArrayLike<any>, useTimezone: boolean) => {
			const list = Array.prototype.slice.call(args);
			const profile = current();

			if (profile.language && list[0] === undefined) {
				list[0] = profile.language.language;
			}

			const options = list[1];

			if (
				useTimezone &&
				profile.timezone &&
				(options === undefined ||
					(options !== null &&
						typeof options === 'object' &&
						options.timeZone === undefined))
			) {
				list[1] = Object.assign({}, options, {timeZone: profile.timezone});
			}

			return list;
		};

		const constructors = [
			'DateTimeFormat',
			'NumberFormat',
			'Collator',
			'PluralRules',
			'RelativeTimeFormat',
			'ListFormat',
			'DisplayNames',
			'Segmenter',
			'DurationFormat',
		];

		for (let i = 0; i < constructors.length; i++) {
			const name = constructors[i]!;
			const Original = w.Intl[name];

			if (typeof Original !== 'function') {
				continue;
			}

			const useTimezone = name === 'DateTimeFormat';
			const Replacement = disguise(
				{
					[name]: function (this: any) {
						const args = withDefaults(arguments, useTimezone);

						return new.target
							? Reflect.construct(Original, args, new.target)
							: Original.apply(this, args);
					},
				}[name],
				Original,
			);
			defineProperty(Replacement, 'prototype', {
				value: Original.prototype,
				writable: false,
				enumerable: false,
				configurable: false,
			});
			defineProperty(Replacement, 'supportedLocalesOf', {
				value: Original.supportedLocalesOf,
				writable: true,
				configurable: true,
			});
			defineProperty(Original.prototype, 'constructor', {
				value: Replacement,
				writable: true,
				configurable: true,
			});
			defineProperty(w.Intl, name, {
				value: Replacement,
				writable: true,
				configurable: true,
			});
		}

		const localeMethods: [any, string, boolean][] = [
			[w.Date.prototype, 'toLocaleString', true],
			[w.Date.prototype, 'toLocaleDateString', true],
			[w.Date.prototype, 'toLocaleTimeString', true],
			[w.Number.prototype, 'toLocaleString', false],
			[w.BigInt?.prototype, 'toLocaleString', false],
			[w.String.prototype, 'localeCompare', false],
		];

		for (let i = 0; i < localeMethods.length; i++) {
			const [target, name, useTimezone] = localeMethods[i]!;

			replaceMethod(
				target,
				name,
				(original) =>
					function (this: any) {
						if (name === 'localeCompare') {
							// (that, locales, options)
							const args = Array.prototype.slice.call(arguments);
							const rest = withDefaults(args.slice(1), false);

							return original.apply(this, [args[0]].concat(rest));
						}

						return original.apply(this, withDefaults(arguments, useTimezone));
					},
			);
		}
	};

	/**
	 * Same-origin frames and popups share the page realm access, spoof them
	 * as soon as the page can reach them (before their own injection).
	 */
	const installFrames = (w: any) => {
		const frameTypes = [w.HTMLIFrameElement, w.HTMLFrameElement];

		for (let i = 0; i < frameTypes.length; i++) {
			const frameProto = frameTypes[i]?.prototype;

			replaceGetter(frameProto, 'contentWindow', (child: any) => {
				try {
					install(child);
				} catch {
					// Cross-origin
				}

				return undefined;
			});
			replaceGetter(frameProto, 'contentDocument', (document: any) => {
				try {
					install(document?.defaultView);
				} catch {
					// Cross-origin
				}

				return undefined;
			});
		}

		replaceMethod(
			w,
			'open',
			(original) =>
				function (this: any) {
					const opened = original.apply(this, arguments as any);

					try {
						install(opened);
					} catch {
						// Cross-origin
					}

					return opened;
				},
		);
	};

	install = (w: any) => {
		if (!w || installedRealms.has(w.Object)) {
			return;
		}

		installedRealms.add(w.Object);

		w.addEventListener(
			channel,
			(event: any) => {
				const detail = event.detail;

				if (detail && typeof detail === 'object' && 'profile' in detail) {
					event.stopImmediatePropagation();
					state.profile = detail.profile;
					detail.installed = true;

					return;
				}

				// From the isolated world relay: objects can't cross worlds,
				// so the profile comes as JSON
				if (typeof detail === 'string') {
					event.stopImmediatePropagation();

					try {
						state.profile = JSON.parse(detail);
					} catch {
						// Ignore malformed
					}
				}
			},
			true,
		);

		const sections = [
			installToString,
			installNavigator,
			installScreen,
			installWebgl,
			installCanvas,
			installTimezone,
			installLocale,
			installFrames,
		];

		for (let i = 0; i < sections.length; i++) {
			try {
				sections[i]!(w);
			} catch {
				// One failing section (unsupported API) should not prevent others
			}
		}
	};

	install(window);
}
