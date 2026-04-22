import { Background, type Node, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@diffkit/ui/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	WorkflowDefinition,
	WorkflowRun,
	WorkflowRunJob,
} from "#/lib/github.types";
import { buildLayoutFromDefinition } from "./graph/build-layout";
import {
	COLUMN_GAP,
	MATRIX_SUFFIX_RE,
	NODE_WIDTH,
	ROW_GAP,
	VARIANT_POPUP_GAP,
} from "./graph/constants";
import { collectConnectedEdgeIds } from "./graph/edges";
import { GraphControls } from "./graph/graph-controls";
import {
	buildColumns,
	getAggregateState,
	getGroupId,
	groupJobs,
} from "./graph/grouping";
import { estimateNodeHeight } from "./graph/height";
import { JobNode } from "./graph/job-node";
import { MatrixNode } from "./graph/matrix-node";
import type {
	FlowNode,
	GraphEdge,
	JobNodeData,
	MatrixNodeData,
} from "./graph/types";

const nodeTypes = {
	job: JobNode,
	matrix: MatrixNode,
};

export function WorkflowRunGraphCanvas({
	run,
	jobs,
	definition,
}: {
	run: WorkflowRun;
	jobs: WorkflowRunJob[];
	definition: WorkflowDefinition | null;
}) {
	const workflowFilename = useMemo(() => {
		const segments = run.path.split("/");
		return segments[segments.length - 1] || run.path;
	}, [run.path]);

	const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => {
		const initial = new Set<string>();
		for (const job of jobs) {
			const match = MATRIX_SUFFIX_RE.exec(job.name);
			if (!match) initial.add(`job-${job.id}`);
		}
		if (definition) {
			for (const yamlJob of definition.jobs) {
				if (!yamlJob.isMatrix) initial.add(`def-${yamlJob.key}`);
			}
		}
		return initial;
	});

	const toggleCollapsed = useCallback((nodeId: string) => {
		setCollapsedNodes((prev) => {
			const next = new Set(prev);
			if (next.has(nodeId)) next.delete(nodeId);
			else next.add(nodeId);
			return next;
		});
	}, []);

	const [collapsedPopupIds, setCollapsedPopupIds] = useState<Set<number>>(
		() => {
			const initial = new Set<number>();
			for (const job of jobs) {
				if (MATRIX_SUFFIX_RE.exec(job.name)) initial.add(job.id);
			}
			return initial;
		},
	);
	const autoCollapsedPopupIdsRef = useRef<Set<number>>(
		new Set(collapsedPopupIds),
	);
	useEffect(() => {
		const toAdd: number[] = [];
		for (const job of jobs) {
			if (!MATRIX_SUFFIX_RE.exec(job.name)) continue;
			if (!autoCollapsedPopupIdsRef.current.has(job.id)) {
				toAdd.push(job.id);
				autoCollapsedPopupIdsRef.current.add(job.id);
			}
		}
		if (toAdd.length === 0) return;
		setCollapsedPopupIds((prev) => {
			const next = new Set(prev);
			for (const id of toAdd) next.add(id);
			return next;
		});
	}, [jobs]);
	const togglePopupCollapsed = useCallback((jobId: number) => {
		setCollapsedPopupIds((prev) => {
			const next = new Set(prev);
			if (next.has(jobId)) next.delete(jobId);
			else next.add(jobId);
			return next;
		});
	}, []);

	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

	const { nodes, baseEdges } = useMemo(() => {
		let builtNodes: FlowNode[] = [];
		let builtEdges: GraphEdge[] = [];

		if (definition) {
			const layout = buildLayoutFromDefinition(
				jobs,
				definition,
				collapsedNodes,
				toggleCollapsed,
			);
			if (layout) {
				builtNodes = layout.nodes;
				builtEdges = layout.edges;
			}
		}

		if (builtNodes.length === 0) {
			const groups = groupJobs(jobs);
			const columns = buildColumns(groups);

			columns.forEach((column, colIndex) => {
				const x = colIndex * (NODE_WIDTH + COLUMN_GAP);
				let currentY = 0;
				for (const group of column) {
					const nodeId = getGroupId(group);
					let flowNode: FlowNode;
					if (group.kind === "matrix") {
						flowNode = {
							id: nodeId,
							type: "matrix",
							position: { x, y: currentY },
							data: {
								baseName: group.baseName,
								jobs: group.jobs,
								aggregate: getAggregateState(group.jobs),
								collapsed: collapsedNodes.has(nodeId),
								onToggleCollapsed: () => toggleCollapsed(nodeId),
							},
						} satisfies Node<MatrixNodeData, "matrix">;
					} else {
						flowNode = {
							id: nodeId,
							type: "job",
							position: { x, y: currentY },
							data: {
								job: group.job,
								collapsed: collapsedNodes.has(nodeId),
								onToggleCollapsed: () => toggleCollapsed(nodeId),
							},
						} satisfies Node<JobNodeData, "job">;
					}
					builtNodes.push(flowNode);
					currentY += estimateNodeHeight(flowNode) + ROW_GAP;
				}
			});

			for (let c = 0; c < columns.length - 1; c++) {
				const prev = columns[c] ?? [];
				const next = columns[c + 1] ?? [];
				for (const prevGroup of prev) {
					for (const nextGroup of next) {
						const prevId = getGroupId(prevGroup);
						const nextId = getGroupId(nextGroup);
						builtEdges.push({
							id: `${prevId}->${nextId}`,
							source: prevId,
							target: nextId,
							type: "smoothstep",
						});
					}
				}
			}
		}

		const matrixNodes = builtNodes.filter(
			(n): n is Node<MatrixNodeData, "matrix"> => n.type === "matrix",
		);
		for (const matrix of matrixNodes) {
			const popupX =
				matrix.position.x + NODE_WIDTH + COLUMN_GAP + VARIANT_POPUP_GAP;
			let popupY = matrix.position.y;
			for (const job of matrix.data.jobs) {
				const popupId = `variant-${matrix.id}-${job.id}`;
				const popupNode = {
					id: popupId,
					type: "job",
					position: { x: popupX, y: popupY },
					data: {
						job,
						collapsed: collapsedPopupIds.has(job.id),
						onToggleCollapsed: () => togglePopupCollapsed(job.id),
					},
				} satisfies Node<JobNodeData, "job">;
				builtNodes.push(popupNode);
				builtEdges.push({
					id: `${matrix.id}->${popupId}`,
					source: matrix.id,
					target: popupId,
					type: "smoothstep",
				});
				popupY += estimateNodeHeight(popupNode) + ROW_GAP;
			}
		}

		return { nodes: builtNodes, baseEdges: builtEdges };
	}, [
		jobs,
		definition,
		collapsedNodes,
		toggleCollapsed,
		collapsedPopupIds,
		togglePopupCollapsed,
	]);

	const edges = useMemo(() => {
		if (!hoveredNodeId) {
			return baseEdges.map((edge) => ({
				...edge,
				style: { stroke: "var(--color-border)", strokeWidth: 1.5 },
			}));
		}
		const connected = collectConnectedEdgeIds(hoveredNodeId, baseEdges);
		return baseEdges.map((edge) => {
			const isConnected = connected.has(edge.id);
			return {
				...edge,
				animated: isConnected,
				zIndex: isConnected ? 1000 : 0,
				style: {
					stroke: isConnected
						? "var(--color-foreground)"
						: "var(--color-border)",
					strokeWidth: isConnected ? 2 : 1.5,
					opacity: isConnected ? 1 : 0.35,
				},
			};
		});
	}, [baseEdges, hoveredNodeId]);

	const containerRef = useRef<HTMLDivElement>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	useEffect(() => {
		const handler = () =>
			setIsFullscreen(document.fullscreenElement === containerRef.current);
		document.addEventListener("fullscreenchange", handler);
		return () => document.removeEventListener("fullscreenchange", handler);
	}, []);
	const toggleFullscreen = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void el.requestFullscreen();
		}
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative flex flex-col overflow-hidden rounded-xl border bg-surface-1",
				isFullscreen && "h-screen w-screen rounded-none",
			)}
		>
			<div
				className={cn(
					"w-full",
					isFullscreen ? "flex-1" : "h-[620px] rounded-b-xl",
				)}
			>
				{nodes.length === 0 ? (
					<p className="p-6 text-muted-foreground text-sm">No jobs yet.</p>
				) : (
					<ReactFlow
						nodes={nodes}
						edges={edges}
						nodeTypes={nodeTypes}
						fitView
						fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
						proOptions={{ hideAttribution: true }}
						nodesConnectable={false}
						nodesDraggable={false}
						edgesFocusable={false}
						defaultEdgeOptions={{ type: "smoothstep" }}
						onNodeMouseEnter={(_e, node) => setHoveredNodeId(node.id)}
						onNodeMouseLeave={() => setHoveredNodeId(null)}
						className="!bg-surface-1 [&_.react-flow__node]:!cursor-default"
					>
						<Background color="var(--color-border)" gap={20} size={1} />
						<GraphControls
							isFullscreen={isFullscreen}
							onToggleFullscreen={toggleFullscreen}
						/>
					</ReactFlow>
				)}
			</div>

			<div className="pointer-events-none absolute top-3 left-3 z-10 flex w-fit flex-col gap-0.5 rounded-lg bg-surface-1 px-4 py-3">
				<h2 className="font-medium text-sm">{workflowFilename}</h2>
				<p className="text-muted-foreground text-xs">on: {run.event}</p>
			</div>
		</div>
	);
}
