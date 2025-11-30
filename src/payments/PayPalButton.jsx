import React, { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from './usePayPalScript';

export default function PayPalButton({ amount, onSuccess, disabled }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  useEffect(() => {
    let cancelled = false;
    if (disabled) return;
    if (!containerRef.current) return;
    setError('');
    loadPayPalSdk(clientId)
      .then((paypal) => {
        if (cancelled) return;
        containerRef.current.innerHTML = '';
        paypal.Buttons({
          style: { layout: 'vertical', shape: 'pill', label: 'paypal' },
          createOrder: (_data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: { value: String(amount.toFixed(2)) },
                },
              ],
            });
          },
          onApprove: async (_data, actions) => {
            try {
              await actions.order.capture();
              onSuccess?.();
            } catch (e) {
              setError(e?.message || 'Payment capture failed');
            }
          },
          onError: (err) => {
            setError(err?.message || 'PayPal error');
          },
        }).render(containerRef.current);
      })
      .catch((e) => setError(e?.message || 'Failed to load PayPal'));
    return () => {
      cancelled = true;
    };
  }, [clientId, amount, onSuccess, disabled]);

  if (disabled) {
    return (
      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
        Sign in to pay
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} />
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 mt-2">
          {error}
        </div>
      )}
    </div>
  );
}


