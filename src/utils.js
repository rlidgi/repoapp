const routes = {
  Home: '/',
  Gallery: '/gallery',
  Pricing: '/pricing',
  Privacy: '/privacy',
  Terms: '/terms',
};

export function createPageUrl(pageName) {
  return routes[pageName] || '/';
}
