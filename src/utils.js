const routes = {
  Home: '/',
  Gallery: '/gallery',
  Pricing: '/pricing',
  Privacy: '/privacy',
  Terms: '/terms',
  Admin: '/admin',
};

export function createPageUrl(pageName) {
  return routes[pageName] || '/';
}
