import React, { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { registerBuiltInFonts } from './utils/fontRegistry';

export default function App() {
  useEffect(() => {
    registerBuiltInFonts();
  }, []);

  return <AppLayout />;
}
