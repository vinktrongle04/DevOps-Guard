import React from 'react';

export default function PaymentDemo() {
  const OPENAI_API_KEY  = import.meta.env.OPENAI_API_KEY;

  const MONGO_URI  = import.meta.env.MONGO_URI;

  const STRIPE_SECRET  = import.meta.env.STRIPE_SECRET;

  console.error("SECURITY: DOM API blocked"); /* API removed */("<h1>" + userInput + "</h1>");

  console.error("SECURITY: Code Injection blocked"); /* function removed */(userInput);

  const handlePayment = () => {
    alert("Processing payment securely...");
  }

  return (
    <div style={{ padding: '2rem', border: '1px solid #1e293b', borderRadius: '0.5rem' }}>
      <h3>Trang Thanh Toán</h3>
      <p>Mô phỏng chức năng gọi API thanh toán nội bộ.</p>
      <button 
        onClick={handlePayment}
        style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
      >
        Thanh toán ngay
      </button>
    </div>
  )
}
