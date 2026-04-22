import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { NODE_HANDLE_CLASS } from "./constants";
import { JobCard } from "./job-card";
import type { JobNodeData } from "./types";

export function JobNode({ data }: NodeProps<Node<JobNodeData, "job">>) {
	const expanded = !data.collapsed;
	return (
		<>
			<Handle
				type="target"
				position={Position.Left}
				className={NODE_HANDLE_CLASS}
			/>
			<JobCard
				job={data.job}
				expanded={expanded}
				onToggle={data.onToggleCollapsed}
			/>
			<Handle
				type="source"
				position={Position.Right}
				className={NODE_HANDLE_CLASS}
			/>
		</>
	);
}
