import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

const calloutVariants = cva(
	"flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm",
	{
		variants: {
			variant: {
				default: "bg-surface-1 text-foreground",
				info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
				warning: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
				success: "bg-green-500/15 text-green-600 dark:text-green-400",
				destructive: "bg-red-500/15 text-red-600 dark:text-red-400",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Callout({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
	return (
		<div
			data-slot="callout"
			className={cn(calloutVariants({ variant }), className)}
			{...props}
		/>
	);
}

function CalloutContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="callout-content"
			className={cn("flex min-w-0 items-center gap-2", className)}
			{...props}
		/>
	);
}

function CalloutAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="callout-action"
			className={cn("shrink-0", className)}
			{...props}
		/>
	);
}

export { Callout, CalloutContent, CalloutAction, calloutVariants };
