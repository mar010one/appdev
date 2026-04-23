'use client';

import { useEffect } from 'react';

function harden(el: Element) {
  if (el instanceof HTMLFormElement) {
    el.setAttribute('autocomplete', 'off');
    return;
  }
  if (el instanceof HTMLInputElement) {
    const isPassword = el.type === 'password';
    el.setAttribute('autocomplete', isPassword ? 'new-password' : 'off');
    el.setAttribute('data-lpignore', 'true');
    el.setAttribute('data-form-type', 'other');
    return;
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.setAttribute('autocomplete', 'off');
  }
}

function scan(root: ParentNode) {
  root.querySelectorAll('form, input, textarea, select').forEach(harden);
}

export default function AutocompleteGuard() {
  useEffect(() => {
    scan(document);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          harden(node);
          scan(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
