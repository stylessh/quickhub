import { useState } from "react";

export function DetailActivityHeader({
	title,
	count,
}: {
	title: string;
	count?: number;
}) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-lg bg-surface-1 px-4 py-2.5">
			<h2 className="text-xs font-medium">{title}</h2>
			{count != null && (
				<span className="text-xs tabular-nums text-muted-foreground">
					{count}
				</span>
			)}
		</div>
	);
}

export function DetailCommentBox() {
	const [value, setValue] = useState("");

	return (
		<div className="flex flex-col gap-2 rounded-lg border bg-surface-0 p-3">
			<textarea
				value={value}
				onChange={(event) => setValue(event.target.value)}
				placeholder="Leave a comment..."
				rows={3}
				className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
			/>
			<div className="flex justify-end">
				<button
					type="button"
					disabled={!value.trim()}
					className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity disabled:opacity-40"
				>
					Send
				</button>
			</div>
		</div>
	);
}
