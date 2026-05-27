import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    // Since we don't have react-router-dom, let's parse the URL search params manually
    const params = new URLSearchParams(window.location.search);
    const razorpay_payment_id = params.get('razorpay_payment_id');
    const razorpay_order_id = params.get('razorpay_order_id');
    const razorpay_signature = params.get('razorpay_signature');

    if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      // call api
      fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_payment_id, razorpay_order_id, razorpay_signature })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('Payment Verified Successfully!');
        } else {
          setStatus('Payment Verification Failed.');
        }
      })
      .catch(err => {
        console.error(err);
        setStatus('Verification Error.');
      });
    } else {
      setStatus('Invalid Payment Response.');
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">{status}</h1>
      <button onClick={() => window.location.hash = 'customer'} className="mt-4 p-2 bg-blue-500 text-white rounded">Back to Portal</button>
    </div>
  );
}
