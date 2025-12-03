import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function upsertMetaByName(name, content) {
	if (!name) return;
	let el = document.querySelector(`meta[name="${name}"]`);
	if (!el) {
		el = document.createElement('meta');
		el.setAttribute('name', name);
		document.head.appendChild(el);
	}
	el.setAttribute('content', content || '');
}

function upsertMetaByProperty(property, content) {
	if (!property) return;
	let el = document.querySelector(`meta[property="${property}"]`);
	if (!el) {
		el = document.createElement('meta');
		el.setAttribute('property', property);
		document.head.appendChild(el);
	}
	el.setAttribute('content', content || '');
}

function upsertLink(rel, href) {
	if (!rel) return;
	let el = document.querySelector(`link[rel="${rel}"]`);
	if (!el) {
		el = document.createElement('link');
		el.setAttribute('rel', rel);
		document.head.appendChild(el);
	}
	if (href) el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
	const scriptId = id || 'seo-jsonld';
	const existing = document.getElementById(scriptId);
	if (existing) existing.remove();
	if (!data) return;
	const el = document.createElement('script');
	el.setAttribute('type', 'application/ld+json');
	el.id = scriptId;
	el.textContent = JSON.stringify(data);
	document.head.appendChild(el);
}

export function useSEO(config) {
	const location = useLocation();
	useEffect(() => {
		const siteName = 'Piclumo';
		const siteUrl =
			(import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) ||
			(window.location && window.location.origin) ||
			'';
		const pathname = config?.path || (location && location.pathname) || '/';
		const fullUrl = `${siteUrl}${pathname}`;
		const baseTitle = config?.title ? `${config.title} | ${siteName}` : siteName;
		const description =
			config?.description ||
			'Create stunning AI images free. Generate visuals from prompts or full articles with Piclumo.';

		// Title
		document.title = baseTitle;

		// Description
		upsertMetaByName('description', description);

		// Canonical
		upsertLink('canonical', fullUrl);

		// Open Graph
		upsertMetaByProperty('og:site_name', siteName);
		upsertMetaByProperty('og:type', config?.ogType || 'website');
		upsertMetaByProperty('og:title', baseTitle);
		upsertMetaByProperty('og:description', description);
		upsertMetaByProperty('og:url', fullUrl);
		if (config?.image) upsertMetaByProperty('og:image', config.image);

		// Twitter
		upsertMetaByName('twitter:card', config?.twitterCard || 'summary_large_image');
		upsertMetaByName('twitter:title', baseTitle);
		upsertMetaByName('twitter:description', description);
		if (config?.image) upsertMetaByName('twitter:image', config.image);

		// JSON-LD
		if (config?.jsonLd) {
			upsertJsonLd('seo-jsonld', config.jsonLd);
		} else {
			upsertJsonLd('seo-jsonld', null);
		}
	}, [
		location,
		config?.title,
		config?.description,
		config?.path,
		config?.image,
		config?.ogType,
		config?.twitterCard,
		config?.jsonLd
	]);
}


