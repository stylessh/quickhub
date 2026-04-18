export type ProtectedRouteCachedAuth = {
	user: {
		id: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
		emailVerified?: boolean;
		createdAt?: Date;
		updatedAt?: Date;
	};
	session: {
		id: string;
		userId?: string;
		expiresAt?: Date;
		token?: string;
		createdAt?: Date;
		updatedAt?: Date;
	};
};

let cachedAuth: ProtectedRouteCachedAuth | null = null;

export function getProtectedRouteCachedAuth(): ProtectedRouteCachedAuth | null {
	return cachedAuth;
}

export function setProtectedRouteCachedAuth(
	next: ProtectedRouteCachedAuth,
): void {
	cachedAuth = next;
}

export function clearProtectedRouteCachedAuth(): void {
	cachedAuth = null;
}
