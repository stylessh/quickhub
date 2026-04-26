/**
 * Server-side persistence for orgs that returned a GitHub OAuth App access
 * restriction error during a previous search. Used to short-circuit the OAuth
 * fallback search source so we don't re-attempt — and re-fail — those queries
 * on every reload (which surfaces a "restricted third-party access" warning
 * and burns per-source timeout budget).
 *
 * Entries are removed automatically by `getMySearchSources` once the user
 * installs the GitHub App on the org (intersect installed orgs with this set).
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { userForbiddenOrg } from "../db/schema";

export async function getForbiddenOrgsForUser(
	userId: string,
): Promise<string[]> {
	const db = getDb();
	const rows = await db
		.select({ org: userForbiddenOrg.org })
		.from(userForbiddenOrg)
		.where(eq(userForbiddenOrg.userId, userId))
		.all();
	return rows.map((row) => row.org);
}

export async function recordForbiddenOrgs(
	userId: string,
	orgs: string[],
): Promise<void> {
	if (orgs.length === 0) return;
	const db = getDb();
	const now = new Date();
	await db
		.insert(userForbiddenOrg)
		.values(
			orgs.map((org) => ({
				userId,
				org,
				createdAt: now,
			})),
		)
		.onConflictDoNothing();
}

export async function clearForbiddenOrgsForUser(
	userId: string,
	orgs?: string[],
): Promise<void> {
	const db = getDb();
	if (orgs && orgs.length === 0) return;
	if (orgs) {
		await db
			.delete(userForbiddenOrg)
			.where(
				and(
					eq(userForbiddenOrg.userId, userId),
					inArray(userForbiddenOrg.org, orgs),
				),
			);
		return;
	}
	await db.delete(userForbiddenOrg).where(eq(userForbiddenOrg.userId, userId));
}
