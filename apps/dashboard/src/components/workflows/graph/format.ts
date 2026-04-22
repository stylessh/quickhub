import type { WorkflowRunJob } from "#/lib/github.types";

export function formatJobDuration(
	job: WorkflowRunJob,
	now?: number,
): string | null {
	if (!job.startedAt) return null;
	const startMs = new Date(job.startedAt).getTime();
	if (Number.isNaN(startMs)) return null;
	const endMs = job.completedAt
		? new Date(job.completedAt).getTime()
		: (now ?? Date.now());
	if (Number.isNaN(endMs)) return null;
	const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes < 60) return `${minutes}m ${seconds}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
}
