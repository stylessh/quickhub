import { ChevronDownIcon } from "@diffkit/icons";
import { cn } from "@diffkit/ui/lib/utils";
import {
	type CheckState,
	CheckStateIcon,
	getCheckState,
} from "#/components/checks/check-state-icon";
import type { WorkflowRunJob, WorkflowRunStep } from "#/lib/github.types";
import { useNow } from "#/lib/use-now";
import { NODE_CARD_CLASS, NODE_HEADER_CLASS, NODE_WIDTH } from "./constants";
import { formatJobDuration } from "./format";

export function getJobCardRingClass(state: CheckState): string {
	if (state === "success") return "ring-4 ring-muted/80 dark:ring-muted/50";
	if (state === "failure")
		return "border-transparent hover:border-transparent ring-4 ring-red-500/25";
	if (state === "pending" || state === "expected")
		return "border-transparent hover:border-transparent ring-4 ring-amber-500/20";
	return "";
}

export function NodeChevron({ open }: { open: boolean }) {
	return (
		<ChevronDownIcon
			className={cn(
				"size-3.5 shrink-0 text-muted-foreground transition-transform",
				open ? "rotate-0" : "-rotate-90",
			)}
		/>
	);
}

export function StepRow({ step }: { step: WorkflowRunStep }) {
	const state = getCheckState(step);
	return (
		<div className="flex items-center gap-2 px-3 py-1.5 first:pt-2 last:pb-2">
			<CheckStateIcon state={state} />
			<span className="min-w-0 flex-1 truncate">{step.name}</span>
		</div>
	);
}

export function JobCard({
	job,
	displayName,
	expanded,
	onToggle,
}: {
	job: WorkflowRunJob;
	displayName?: string;
	expanded: boolean;
	onToggle?: () => void;
}) {
	const now = useNow();
	const state = getCheckState(job);
	const duration = formatJobDuration(job, now);
	const name = displayName ?? job.name;
	return (
		<div
			className={cn(NODE_CARD_CLASS, getJobCardRingClass(state))}
			style={{ width: NODE_WIDTH }}
		>
			<button
				type="button"
				onClick={onToggle}
				disabled={!onToggle}
				className={NODE_HEADER_CLASS}
			>
				<CheckStateIcon state={state} />
				<span className="min-w-0 flex-1 truncate font-medium text-sm">
					{name}
				</span>
				{duration ? (
					<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
						{duration}
					</span>
				) : null}
				{onToggle ? <NodeChevron open={expanded} /> : null}
			</button>
			{expanded ? (
				<div className="flex flex-col border-t text-xs">
					{job.steps.length === 0 ? (
						<div className="px-3 py-2 text-muted-foreground">No steps</div>
					) : (
						job.steps.map((step) => <StepRow key={step.number} step={step} />)
					)}
				</div>
			) : null}
		</div>
	);
}
