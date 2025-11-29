const routes = {
  Home: '/',
  Gallery: '/gallery',
};

export function createPageUrl(pageName) {
  return routes[pageName] || '/';
}
