import { useState, useEffect } from 'react';

export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => setIsOpen(false);
    setTimeout(() => window.addEventListener('click', handler), 0);
    return () => window.removeEventListener('click', handler);
  }, [isOpen]);

  return { isOpen, setIsOpen };
}
