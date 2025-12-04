import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		// Disable browser scroll restoration to avoid landing mid-page on navigation/refresh
		if ('scrollRestoration' in window.history) {
			window.history.scrollRestoration = 'manual';
		}
		// Scroll to top on initial mount
		const id = requestAnimationFrame(() => {
			window.scrollTo(0, 0);
		});
		return () => cancelAnimationFrame(id);
	}, []);

	useEffect(() => {
		// On route change, jump to top immediately
		window.scrollTo(0, 0);
	}, [pathname]);
	return null;
}


