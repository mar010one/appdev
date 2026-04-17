'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalPortal({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;
  return createPortal(children, document.body);
}
