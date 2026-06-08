import React from 'react';
import TemplatePanel from './TemplatePanel';
import Canvas from './Canvas';
import PropertyPanel from './PropertyPanel';
import StatusBar from './StatusBar';

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-200 select-none">
      {/* Menu bar area (placeholder — native menu handled by Electron) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Template Panel */}
        <TemplatePanel />
        {/* Center: Canvas */}
        <Canvas />
        {/* Right: Property Panel */}
        <PropertyPanel />
      </div>
      {/* Bottom: Status Bar */}
      <StatusBar />
    </div>
  );
}
