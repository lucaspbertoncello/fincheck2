import '@fincheck/ui/styles/fincheck.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { GalleryApp } from '#gallery/components/shell/gallery-app.component.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GalleryApp />
  </StrictMode>,
);
