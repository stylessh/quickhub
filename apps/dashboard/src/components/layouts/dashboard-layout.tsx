import { getRouteApi, Outlet } from "@tanstack/react-router";
import { DashboardTopbar } from "./dashboard-topbar";

const routeApi = getRouteApi("/_protected");

export function DashboardLayout() {
	const { user } = routeApi.useRouteContext();

	return (
		<div className="flex h-dvh flex-col bg-muted">
			<DashboardTopbar user={user} />
			<div className="flex flex-1 flex-col overflow-hidden p-2 pt-0">
				<div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.03)]">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
