import { describe, expect, it } from "vitest";
import { normalizeGitHubAppPrivateKey } from "./github-private-key";

describe("normalizeGitHubAppPrivateKey", () => {
	it("converts PKCS#1 RSA private keys to PKCS#8", () => {
		const normalized = normalizeGitHubAppPrivateKey(
			"-----BEGIN RSA PRIVATE KEY-----\\nAQID\\n-----END RSA PRIVATE KEY-----",
		);

		expect(normalized).toContain("-----BEGIN PRIVATE KEY-----");
		expect(normalized).toContain("-----END PRIVATE KEY-----");
		expect(normalized).not.toContain("RSA PRIVATE KEY");
		expect(normalized).not.toContain("AQID");
	});

	it("preserves PKCS#8 private keys while normalizing escaped newlines", () => {
		expect(
			normalizeGitHubAppPrivateKey(
				"-----BEGIN PRIVATE KEY-----\\nAQID\\n-----END PRIVATE KEY-----",
			),
		).toBe("-----BEGIN PRIVATE KEY-----\nAQID\n-----END PRIVATE KEY-----");
	});
});
