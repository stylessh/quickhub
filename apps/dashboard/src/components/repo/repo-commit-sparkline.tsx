import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Area, AreaChart } from "recharts";
import {
	type GitHubQueryScope,
	githubRepoParticipationQueryOptions,
} from "#/lib/github.query";
import { useHasMounted } from "#/lib/use-has-mounted";

const CHART_W = 168;
const CHART_H = 52;
const ACTIVE_LINE = "#60C679";

/** Inactive series: theme foreground so contrast tracks light/dark; opacity keeps it subdued vs text. */
const INACTIVE_STROKE = "var(--foreground)";

const ACTIVE_GRADIENT_STOPS = [
	{ offset: "0%", opacity: 0.52 },
	{ offset: "50%", opacity: 0.2 },
	{ offset: "100%", opacity: 0 },
] as const;

const INACTIVE_GRADIENT_STOPS = [
	{ offset: "0%", opacity: 0.44 },
	{ offset: "50%", opacity: 0.14 },
	{ offset: "100%", opacity: 0 },
] as const;

/** Weekly commit sparkline; muted when there are no commits in the loaded range. */
export function RepoCommitSparkline({
	scope,
	owner,
	repo,
}: {
	scope: GitHubQueryScope;
	owner: string;
	repo: string;
}) {
	const fillGradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
	const hasMounted = useHasMounted();
	const query = useQuery({
		...githubRepoParticipationQueryOptions(scope, { owner, repo }),
		enabled: hasMounted,
	});

	if (!hasMounted || query.isLoading) {
		return (
			<div
				className="h-[52px] w-[168px] shrink-0 rounded-sm bg-muted/15"
				aria-hidden
			/>
		);
	}

	const weekly = query.data?.weeklyCommits ?? [];
	const hasActivity =
		weekly.length > 0 && weekly.some((n) => typeof n === "number" && n > 0);
	const strokeColor = hasActivity ? ACTIVE_LINE : INACTIVE_STROKE;
	const strokeOpacity = hasActivity ? 1 : 0.5;
	const gradientStops = hasActivity
		? ACTIVE_GRADIENT_STOPS
		: INACTIVE_GRADIENT_STOPS;

	const chartData =
		weekly.length > 0
			? weekly.map((commits, i) => ({ i, commits }))
			: Array.from({ length: 52 }, (_, i) => ({ i, commits: 0 }));

	const chartLabel = hasActivity
		? `Weekly commit activity for ${owner}/${repo}, last 52 weeks`
		: `No commits in the last 52 weeks for ${owner}/${repo}`;

	return (
		<div
			role="img"
			className="pointer-events-none shrink-0 select-none"
			aria-label={chartLabel}
		>
			<AreaChart
				width={CHART_W}
				height={CHART_H}
				data={chartData}
				margin={{ top: 6, right: 2, bottom: 4, left: 2 }}
			>
				<defs>
					<linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
						{gradientStops.map((stop) => (
							<stop
								key={stop.offset}
								offset={stop.offset}
								stopColor={strokeColor}
								stopOpacity={stop.opacity}
							/>
						))}
					</linearGradient>
				</defs>
				<Area
					type="monotone"
					dataKey="commits"
					stroke={strokeColor}
					strokeWidth={2}
					strokeOpacity={strokeOpacity}
					fill={`url(#${fillGradientId})`}
					dot={false}
					isAnimationActive={false}
					connectNulls
				/>
			</AreaChart>
		</div>
	);
}
