import { createEffect, createSignal, For, Show, batch} from "solid-js";
import { DriverList, TimingData, TrackStatus, Message as RaceControlMessage, Positions } from "@/types/state.type";

import { objectEntries } from "@/lib/driverHelper";
import { fetchMap } from "@/lib/fetchMap";
import { MapType, TrackPosition } from "@/types/map.type";
import { sortUtc } from "@/lib/sorting";
import { getTrackStatusMessage } from "@/lib/getTrackStatusMessage";

// This is basically fearlessly copied from
// https://github.com/tdjsnelling/monaco

type Props = {
	circuitKey: number | undefined;
	drivers: DriverList | undefined;
	timingDrivers: TimingData | undefined;
	positions: Positions | null;

	trackStatus: TrackStatus | undefined;
	raceControlMessages: RaceControlMessage[] | undefined;
};

const space = 1000;

const rad = (deg: number) => deg * (Math.PI / 180);

const rotate = (x: number, y: number, a: number, px: number, py: number) => {
	const c = Math.cos(rad(a));
	const s = Math.sin(rad(a));

	x -= px;
	y -= py;

	const newX = x * c - y * s;
	const newY = y * c + x * s;

	return { y: newX + px, x: newY + py };
};

type Sector = {
	number: number;
	start: TrackPosition;
	end: TrackPosition;
	points: TrackPosition[];
};

const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

const findMinDistance = (point: TrackPosition, points: TrackPosition[]) => {
	let min = Infinity;
	let minIndex = -1;
	for (let i = 0; i < points.length; i++) {
		const distance = calculateDistance(point.x, point.y, points[i].x, points[i].y);
		if (distance < min) {
			min = distance;
			minIndex = i;
		}
	}
	return minIndex;
};

const createSectors = (map: MapType) => {
	const sectors: Sector[] = [];
	const points: TrackPosition[] = map.x.map((x, index) => ({ x, y: map.y[index] }));

	for (let i = 0; i < map.marshalSectors.length; i++) {
		sectors.push({
			number: i + 1,
			start: map.marshalSectors[i].trackPosition,
			end: map.marshalSectors[i + 1] ? map.marshalSectors[i + 1].trackPosition : map.marshalSectors[0].trackPosition,
			points: [],
		});
	}

	let dividers: number[] = sectors.map((s) => findMinDistance(s.start, points));
	for (let i = 0; i < dividers.length; i++) {
		let start = dividers[i];
		let end = dividers[i + 1] ? dividers[i + 1] : dividers[0];
		if (start < end) {
			sectors[i].points = points.slice(start, end + 1);
		} else {
			sectors[i].points = points.slice(start).concat(points.slice(0, end + 1));
		}
	}

	return sectors;
};

const findYellowSectors = (messages: RaceControlMessage[] | undefined): Set<number> => {
	const msgs = messages?.sort(sortUtc).filter((msg) => {
		return msg.flag === "YELLOW" || msg.flag === "DOUBLE YELLOW" || msg.flag === "CLEAR";
	});

	if (!msgs) {
		return new Set();
	}

	const done: Set<number> = new Set();
	const sectors: Set<number> = new Set();
	for (let i = 0; i < msgs.length; i++) {
		const msg = msgs[i];
		if (msg.scope === "Track" && msg.flag !== "CLEAR") {
			// Spam with sectors so all sectors are yellow no matter what
			// number of sectors there really are
			for (let j = 0; j < 100; j++) {
				sectors.add(j);
			}
			return sectors;
		}
		if (msg.scope === "Sector") {
			if (!msg.sector || done.has(msg.sector)) {
				continue;
			}
			if (msg.flag === "CLEAR") {
				done.add(msg.sector);
			} else {
				sectors.add(msg.sector);
			}
		}
	}
	return sectors;
};

type RenderedSector = {
	number: number;
	d: string;
	color: string;
	stroke_width: number;
	pulse?: number;
};

const priorizeColoredSectors = (a: RenderedSector, b: RenderedSector) => {
	if (a.color === "stroke-white" && b.color !== "stroke-white") {
		return -1;
	}
	if (a.color !== "stroke-white" && b.color === "stroke-white") {
		return 1;
	}
	return a.number - b.number;
};

const rotationFIX = 90;

export default function Map(
//   {
// 	circuitKey,
// 	drivers,
// 	timingDrivers,
// 	trackStatus,
// 	raceControlMessages,
// 	positions,
// }
props: Props) {
	const [points, setPoints] = createSignal<null | { x: number; y: number }[]>(null);
	const [sectors, setSectors] = createSignal<Sector[]>([]);

	const [rotation, setRotation] = createSignal<number>(0);

 //minX, minY, widthX, widthY
	const [bounds, setBounds] = createSignal<(null | number)[]>([null, null, null, null]);
 //centerX, centerY
	const [center, setCenter] = createSignal<(null | number)[]>([null, null]);

	createEffect(() => {
		(async () => {
			if (!props.circuitKey) return;
			const mapJson = await fetchMap(props.circuitKey);

			const centerX = (Math.max(...mapJson.x) - Math.min(...mapJson.x)) / 2;
			const centerY = (Math.max(...mapJson.y) - Math.min(...mapJson.y)) / 2;

			const fixedRotation = mapJson.rotation + rotationFIX;

			const sectors = createSectors(mapJson).map((s) => {
				const start = rotate(s.start.x, s.start.y, fixedRotation, centerX, centerY);
				const end = rotate(s.end.x, s.end.y, fixedRotation, centerX, centerY);
				const points = s.points.map((p) => rotate(p.x, p.y, fixedRotation, centerX, centerY));
				return {
					...s,
					start,
					end,
					points,
				};
			});

			const rotatedPoints = mapJson.x.map((x, index) => rotate(x, mapJson.y[index], fixedRotation, centerX, centerY));

			const pointsX = rotatedPoints.map((item) => item.x);
			const pointsY = rotatedPoints.map((item) => item.y);

			const cMinX = Math.min(...pointsX) - space;
			const cMinY = Math.min(...pointsY) - space;
			const cWidthX = Math.max(...pointsX) - cMinX + space * 2;
			const cWidthY = Math.max(...pointsY) - cMinY + space * 2;

			batch(() => {
			setCenter([centerX, centerY]);
			setBounds([cMinX, cMinY, cWidthX, cWidthY]);
			setSectors(sectors);
			setPoints(rotatedPoints);
			setRotation(fixedRotation);
			})
		})();
	});

  const renderedSectors = () => {

		const status = getTrackStatusMessage(props.trackStatus?.status ? parseInt(props.trackStatus?.status) : undefined);
		let color: (sector: Sector) => string;
		if (status?.bySector) {
			const yellowSectors = findYellowSectors(props.raceControlMessages);
			color = (sector) => {
				if (yellowSectors.has(sector.number)) {
					return status?.trackColor || "stroke-white";
				} else {
					return "stroke-white";
				}
			};
		} else {
			color = (_) => status?.trackColor || "stroke-white";
		}

		return sectors()
			.map((sector) => {
				const start = `M${sector.points[0].x},${sector.points[0].y}`;
				const rest = sector.points.map((point) => `L${point.x},${point.y}`).join(" ");

				const c = color(sector);
				return {
					number: sector.number,
					d: `${start} ${rest}`,
					color: c,
					stroke_width: c === "stroke-white" ? 60 : 120,
					pulse: status?.pulse,
				};
			})
			.sort(priorizeColoredSectors);
	};

	return (
	<Show when={(points() && bounds()[0] && bounds()[1] && bounds()[2] && bounds()[3])}
		fallback={
				<div class="h-full w-full p-2" style={{ "min-height": "35rem" }}>
					<div class="h-full w-full animate-pulse rounded-lg bg-zinc-800" />
				</div>
		}
		>
		<svg
			//{`${minX} ${minY} ${widthX} ${widthY}`}
			viewBox={bounds().join(" ")}
			class="h-full w-full xl:max-h-screen"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				class="stroke-gray-800"
				stroke-width={300}
				stroke-linejoin="round"
				fill="transparent"
				d={`M${points()[0].x},${points()[0].y} ${points().map((point) => `L${point().x},${point().y}`).join(" ")}`}
			/>
			<For each={renderedSectors()}>
			{(sector) => {
				const style = sector.pulse
					? {
							animation: `${sector.pulse * 100}ms linear infinite pulse`,
						}
					: {};
				return (
					<path
						id={`map.sector.${sector.number}`}
						class={sector.color}
						stroke-width={sector.stroke_width}
						stroke-linecap="round"
						stroke-linejoin="round"
						fill="transparent"
						d={sector.d}
						style={style}
					/>
				);
			}}
			</For>
			<Show when={center()[0] && center()[1] && props.positions && props.drivers}>
				<For each={objectEntries(props.drivers!).reverse().filter((driver) => !!positions[driver.racingNumber].X && !!positions[driver.racingNumber].Y)}>
					{
						(driver) => {
							const pos = props.positions[driver.racingNumber];
							const timingDriver = props.timingDrivers?.lines[driver.racingNumber];
							const hidden = timingDriver
								? timingDriver.knockedOut || timingDriver.stopped || timingDriver.retired
								: false;
							const pit = timingDriver ? timingDriver.inPit : false;

							const rotatedPos = rotate(pos.X, pos.Y, rotation(), center()[0], center()[1]);
							const transform = [`translateX(${rotatedPos.x}px)`, `translateY(${rotatedPos.y}px)`].join(" ");

							return (
								<g
									id={`map.driver.${driver.racingNumber}`}
									class="fill-zinc-700" 
									classList={{
										"opacity-30": pit,
									 "opacity-0": hidden 
									}}
									style={{
										transition: "all 1s linear",
										transform,
										...(driver.teamColour && { fill: `#${driver.teamColour}` }),
									}}
								>
									<circle id={`map.driver.${driver.racingNumber}.circle`} r={120} />
									<text
										id={`map.driver.${driver.racingNumber}.text`}
										font-weight="bold"
										font-size={`${120 * 3}`}
										style={{
											transform: "translateX(150px) translateY(-120px)",
										}}
									>
										{driver.tla}
									</text>
								</g>
							);
						}}
				</For>
			</Show> 
		</svg>
	</Show>)
}
