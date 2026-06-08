import React, { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { registerBuiltInFonts } from './utils/fontRegistry';
import { useKeyboard } from './hooks/useKeyboard';

export default function App() {
  useEffect(() => {
    registerBuiltInFonts();
  }, []);

  useKeyboard();

  return <AppLayout />;
}
