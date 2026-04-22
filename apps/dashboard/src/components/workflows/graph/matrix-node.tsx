import { cn } from "@diffkit/ui/lib/utils";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import {
	CheckStateIcon,
	getCheckState,
} from "#/components/checks/check-state-icon";
import { useNow } from "#/lib/use-now";
import {
	MATRIX_SUFFIX_RE,
	NODE_CARD_CLASS,
	NODE_HANDLE_CLASS,
	NODE_HEADER_CLASS,
	NODE_WIDTH,
} from "./constants";
import { formatJobDuration } from "./format";
import { NodeChevron } from "./job-card";
import type { MatrixNodeData } from "./types";

export function MatrixNode({
	data,
}: NodeProps<Node<MatrixNodeData, "matrix">>) {
	const now = useNow();
	const expanded = !data.collapsed;
	const completedCount = data.jobs.filter(
		(j) => j.status === "completed",
	).length;
	return (
		<>
			<Handle
				type="target"
				position={Position.Left}
				className={NODE_HANDLE_CLASS}
			/>
			<div
				className="flex flex-col gap-1.5 rounded-xl border bg-muted/40 p-1.5"
				style={{ width: NODE_WIDTH + 12 }}
			>
				<div
					className={cn(NODE_CARD_CLASS, "shadow-md")}
					style={{ width: NODE_WIDTH }}
				>
					<button
						type="button"
						onClick={data.onToggleCollapsed}
						disabled={!data.onToggleCollapsed}
						className={NODE_HEADER_CLASS}
					>
						<CheckStateIcon state={data.aggregate} />
						<span className="min-w-0 flex-1 truncate font-medium text-sm">
							{data.baseName}
						</span>
						<span className="inline-flex shrink-0 items-center rounded-full bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground tabular-nums">
							{data.jobs.length}
						</span>
						{data.onToggleCollapsed ? <NodeChevron open={expanded} /> : null}
					</button>
					{expanded ? (
						<div className="flex items-center justify-between gap-3 border-t px-3 py-1.5 text-xs">
							<span className="text-muted-foreground">Matrix</span>
							<span className="font-medium">
								{completedCount} / {data.jobs.length} completed
							</span>
						</div>
					) : null}
				</div>
				{expanded
					? data.jobs.map((job) => {
							const match = MATRIX_SUFFIX_RE.exec(job.name);
							const variant = match ? `(${match[2]})` : job.name;
							const jobDuration = formatJobDuration(job, now);
							return (
								<div
									key={job.id}
									className="flex items-center gap-2 rounded-lg border bg-secondary px-3 py-2 text-left text-xs"
									style={{ width: NODE_WIDTH }}
								>
									<CheckStateIcon state={getCheckState(job)} />
									<span className="min-w-0 flex-1 truncate font-medium">
										{variant}
									</span>
									{jobDuration ? (
										<span className="shrink-0 text-muted-foreground tabular-nums">
											{jobDuration}
										</span>
									) : null}
								</div>
							);
						})
					: null}
			</div>
			<Handle
				type="source"
				position={Position.Right}
				className={NODE_HANDLE_CLASS}
			/>
		</>
	);
}
