"use client";

import { useEffect, useState } from "react";

interface CartToastProps {
  message: string | null;
  onDone: () => void;
}

export default function CartToast({ message, onDone }: CartToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), 1800);
    const clear = setTimeout(onDone, 2200);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [message]);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
        <span className="text-green-400">✓</span>
        <span><strong>{message}</strong> added to cart</span>
      </div>
    </div>
  );
}
