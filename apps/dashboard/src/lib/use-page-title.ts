import { useEffect } from "react";
import { formatPageTitle } from "./seo";

export function usePageTitle(title: string | null | undefined) {
	useEffect(() => {
		if (!title) return;
		document.title = formatPageTitle(title);
	}, [title]);
}
