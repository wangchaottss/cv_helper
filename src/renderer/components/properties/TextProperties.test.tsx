import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextProperties from './TextProperties';
import type { TextElement } from '../../types/elements';

const mockElement: TextElement = {
  id: 'text-1', type: 'text',
  x: 100, y: 200, width: 300, height: 100, rotation: 0, pageIndex: 0, zIndex: 1,
  contentHTML: 'Hello',
  defaultFontFamily: 'Inter', defaultFontSize: 16, defaultColor: '#000000',
  defaultFontWeight: 400, defaultFontStyle: 'normal', defaultTextAlign: 'left',
  defaultLineHeight: 1.5, defaultBackgroundColor: 'transparent',
};

beforeAll(() => {
  (window as any).electronAPI = { getSystemFonts: vi.fn().mockResolvedValue([]) };
});

describe('TextProperties', () => {
  it('renders paragraph-level property groups', () => {
    render(<TextProperties element={mockElement} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('text-properties')).toBeInTheDocument();
    expect(screen.getByText('Align')).toBeInTheDocument();
    expect(screen.getByText('Line Height')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('calls onUpdate when line height changes', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '2' } });
    expect(onUpdate).toHaveBeenCalledWith({ defaultLineHeight: 2 });
  });

  it('calls onUpdate when alignment is toggled', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTitle('Align center'));
    expect(onUpdate).toHaveBeenCalledWith({ defaultTextAlign: 'center' });
  });

  it('shows disabled controls when disabled prop is true', () => {
    const onUpdate = vi.fn();
    render(<TextProperties element={mockElement} onUpdate={onUpdate} disabled />);
    const btn = screen.getByTitle('Align left');
    expect(btn).toBeDisabled();
  });

  it('displays element ID', () => {
    render(<TextProperties element={mockElement} onUpdate={vi.fn()} />);
    expect(screen.getByText('ID: text-1')).toBeInTheDocument();
  });
});
