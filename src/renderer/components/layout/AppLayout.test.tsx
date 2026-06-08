import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppLayout from './AppLayout';

// Mock the store since components depend on it
// The Zustand store is imported directly, so we just test basic rendering

describe('AppLayout', () => {
  it('renders the template panel', () => {
    render(<AppLayout />);
    expect(screen.getByText('Elements')).toBeInTheDocument();
  });

  it('renders template items', () => {
    render(<AppLayout />);
    expect(screen.getByText('Text Block')).toBeInTheDocument();
    expect(screen.getByText('Image Block')).toBeInTheDocument();
  });

  it('renders the property panel', () => {
    render(<AppLayout />);
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('renders the canvas area', () => {
    render(<AppLayout />);
    expect(screen.getByTestId('canvas-area')).toBeInTheDocument();
    expect(screen.getByTestId('a4-canvas')).toBeInTheDocument();
  });

  it('renders the status bar with zoom and toggle buttons', () => {
    render(<AppLayout />);
    expect(screen.getByTestId('zoom-display')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-guides')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-snap')).toBeInTheDocument();
  });

  it('renders the placeholder text in property panel', () => {
    render(<AppLayout />);
    expect(screen.getByTestId('properties-placeholder')).toBeInTheDocument();
    expect(screen.getByText('Select an element to edit its properties')).toBeInTheDocument();
  });
});
