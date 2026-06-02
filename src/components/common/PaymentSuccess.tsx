import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('Payment Verified Successfully!');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">{status}</h1>
      <button onClick={() => window.location.hash = 'customer'} className="mt-4 p-2 bg-blue-500 text-white rounded">Back to Portal</button>
    </div>
  );
}
