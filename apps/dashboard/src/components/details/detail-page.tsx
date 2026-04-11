import { Skeleton } from "@diffkit/ui/components/skeleton";
import { cn } from "@diffkit/ui/lib/utils";
import { Link } from "@tanstack/react-router";

type DetailHeaderIcon = React.ComponentType<{
	size?: number;
	strokeWidth?: number;
	className?: string;
}>;

export function DetailPageLayout({
	main,
	sidebar,
}: {
	main: React.ReactNode;
	sidebar: React.ReactNode;
}) {
	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto grid max-w-7xl gap-16 px-3 py-10 md:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
				<div className="flex min-w-0 flex-col gap-8">{main}</div>
				{sidebar}
			</div>
		</div>
	);
}

export function DetailPageTitle({
	collectionHref,
	collectionLabel,
	owner,
	repo,
	number,
	icon: Icon,
	iconClassName,
	title,
	subtitle,
}: {
	collectionHref: string;
	collectionLabel: string;
	owner: string;
	repo: string;
	number: number;
	icon: DetailHeaderIcon;
	iconClassName?: string;
	title: string;
	subtitle: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Link
					to={collectionHref}
					className="transition-colors hover:text-foreground"
				>
					{collectionLabel}
				</Link>
				<span>/</span>
				<span>
					{owner}/{repo}
				</span>
				<span>/</span>
				<span>#{number}</span>
			</div>

			<div className="flex items-start gap-3">
				<div className={cn("mt-1 shrink-0", iconClassName)}>
					<Icon size={20} strokeWidth={2} />
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
					{subtitle}
				</div>
			</div>
		</div>
	);
}

export function DetailPageSkeletonLayout({
	main,
	sidebarSectionCount = 4,
}: {
	main: React.ReactNode;
	sidebarSectionCount?: number;
}) {
	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto grid max-w-7xl gap-16 px-3 py-10 md:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
				<div className="flex min-w-0 flex-col gap-8">{main}</div>
				<aside className="flex h-fit flex-col gap-6 xl:sticky xl:top-10">
					{Array.from(
						{ length: sidebarSectionCount },
						(_, index) => `sidebar-skeleton-${index}`,
					).map((key) => (
						<div key={key} className="flex flex-col gap-2.5">
							<Skeleton className="h-4 w-24 rounded-md" />
							<div className="flex flex-col gap-2">
								<Skeleton className="h-4 w-full rounded-md" />
								<Skeleton className="h-4 w-[85%] rounded-md" />
							</div>
						</div>
					))}
				</aside>
			</div>
		</div>
	);
}
