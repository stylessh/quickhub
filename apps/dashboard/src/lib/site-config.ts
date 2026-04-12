type SiteConfig = {
	name: string;
	domain: string;
	url: string;
	/** Where users install the GitHub → DiffKit redirect browser extension (store or docs). */
	browserExtensionInstallUrl: string;
	githubRepositoryUrl: string;
	themeColor: string;
	socialImagePath: string;
	defaultTitle: string;
	defaultDescription: string;
	manifestName: string;
	manifestCategories: string[];
};

export const siteConfig: SiteConfig = {
	name: "DiffKit",
	domain: "diff-kit.com",
	url: "https://diff-kit.com",
	browserExtensionInstallUrl:
		"https://github.com/stylessh/diffkit/blob/main/extensions/diffkit-redirect/README.md#install-locally",
	githubRepositoryUrl: "https://github.com/stylessh/diffkit",
	themeColor: "#00C943",
	socialImagePath: "/logo512.png",
	defaultTitle:
		"DiffKit | GitHub dashboard for pull requests, issues, and reviews",
	defaultDescription:
		"DiffKit helps developers track pull requests, issues, and code reviews across GitHub in one fast, focused dashboard.",
	manifestName: "DiffKit Dashboard",
	manifestCategories: ["developer tools", "productivity"],
};
