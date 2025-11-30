const routes = {
  Home: '/',
  Gallery: '/gallery',
  Pricing: '/pricing',
};

export function createPageUrl(pageName) {
  return routes[pageName] || '/';
}
