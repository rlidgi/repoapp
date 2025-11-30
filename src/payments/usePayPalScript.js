export function loadPayPalSdk(clientId, currency = 'USD') {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('Missing PayPal client ID'));
      return;
    }
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }
    const params = new URLSearchParams({
      'client-id': clientId,
      currency,
      components: 'buttons',
      intent: 'capture',
    });
    // Enable verbose logs in dev to help diagnose load issues
    try {
      // import.meta.env is available in Vite
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        params.set('debug', 'true');
      }
    } catch {
      // ignore if not available
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}


