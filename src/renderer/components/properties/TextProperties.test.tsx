import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextProperties from './TextProperties';
import type { TextElement } from '../../types/elements';

const mockElement: TextElement = {
  id: 'text-1',
  type: 'text',
  x: 100,
  y: 200,
  width: 300,
  height: 100,
  rotation: 0,
  zIndex: 1,
  contentHTML: 'Hello',
  defaultFontFamily: 'Inter',
  defaultFontSize: 16,
  defaultColor: '#000000',
  defaultFontWeight: 400,
  defaultFontStyle: 'normal',
  defaultTextAlign: 'left',
  defaultLineHeight: 1.5,
  defaultBackgroundColor: 'transparent',
};

// Mock electron API for FontSelector child
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electronAPI = {
    getSystemFonts: vi.fn().mockResolvedValue([]),
  };
});

describe('TextProperties', () => {
  it('renders all property groups', () => {
    render(<TextProperties element={mockElement} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('text-properties')).toBeInTheDocument();
    expect(screen.getByText('Font')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('Align')).toBeInTheDocument();
    expect(screen.getByText('Line Height')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('calls onUpdate when font size changes', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} />);

    const sizeInputs = screen.getAllByRole('spinbutton');
    const fontSizeInput = sizeInputs[0]; // First number input is font size
    fireEvent.change(fontSizeInput, { target: { value: '24' } });

    expect(onUpdate).toHaveBeenCalledWith({ defaultFontSize: 24 });
  });

  it('calls onUpdate when bold is toggled', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} />);

    const boldBtn = screen.getByTitle('Bold');
    fireEvent.click(boldBtn);

    expect(onUpdate).toHaveBeenCalledWith({ defaultFontWeight: 700 });
  });

  it('calls onUpdate when italic is toggled', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} />);

    const italicBtn = screen.getByTitle('Italic');
    fireEvent.click(italicBtn);

    expect(onUpdate).toHaveBeenCalledWith({ defaultFontStyle: 'italic' });
  });

  it('shows disabled controls when disabled prop is true', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} disabled />);

    const boldBtn = screen.getByTitle('Bold');
    expect(boldBtn).toBeDisabled();
  });

  it('displays element ID', () => {
    render(<TextProperties element={mockElement} onUpdate={vi.fn()} />);
    expect(screen.getByText('ID: text-1')).toBeInTheDocument();
  });
});
