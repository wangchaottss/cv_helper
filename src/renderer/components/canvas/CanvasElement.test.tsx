import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CanvasElement from './CanvasElement';
import type { TextElement, ImageElement } from '../../types/elements';

const mockTextElement: TextElement = {
  id: 'text-1',
  type: 'text',
  x: 100,
  y: 200,
  width: 300,
  height: 100,
  rotation: 0,
  pageIndex: 0,
  zIndex: 1,
  contentHTML: 'Hello World',
  defaultFontFamily: 'Inter',
  defaultFontSize: 16,
  defaultColor: '#000000',
  defaultFontWeight: 400,
  defaultFontStyle: 'normal',
  defaultTextAlign: 'left',
  defaultLineHeight: 1.5,
  defaultBackgroundColor: 'transparent',
};

const mockImageElement: ImageElement = {
  id: 'img-1',
  type: 'image',
  x: 50,
  y: 50,
  width: 200,
  height: 200,
  rotation: 0,
  pageIndex: 0,
  zIndex: 2,
  src: '',
  objectFit: 'contain',
};

const noop = vi.fn();

describe('CanvasElement', () => {
  describe('text element', () => {
    it('renders text content', () => {
      render(
        <CanvasElement element={mockTextElement} isSelected={false} onPointerDown={noop} onResizeStart={noop} />,
      );
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders with correct data-testid', () => {
      render(
        <CanvasElement element={mockTextElement} isSelected={false} onPointerDown={noop} onResizeStart={noop} />,
      );
      expect(screen.getByTestId('element-text-1')).toBeInTheDocument();
    });

    it('shows selection outline when selected', () => {
      render(
        <CanvasElement element={mockTextElement} isSelected={true} onPointerDown={noop} onResizeStart={noop} />,
      );
      const el = screen.getByTestId('element-text-1');
      expect(el.style.outline).toContain('2px solid');
    });

    it('does not show outline when not selected', () => {
      render(
        <CanvasElement element={mockTextElement} isSelected={false} onPointerDown={noop} onResizeStart={noop} />,
      );
      const el = screen.getByTestId('element-text-1');
      expect(el.style.outline).toBe('');
    });
  });

  describe('image element', () => {
    it('renders placeholder when no src', () => {
      render(
        <CanvasElement element={mockImageElement} isSelected={false} onPointerDown={noop} onResizeStart={noop} />,
      );
      expect(screen.getByText('Image Placeholder')).toBeInTheDocument();
    });

    it('renders image when src is provided', () => {
      const imgElement = { ...mockImageElement, src: 'data:image/png;base64,abc123' };
      render(
        <CanvasElement element={imgElement} isSelected={false} onPointerDown={noop} onResizeStart={noop} />,
      );
      const img = screen.getByAltText('');
      expect(img).toBeInTheDocument();
    });

    it('shows dashed border when no image loaded', () => {
      render(
        <CanvasElement element={mockImageElement} isSelected={false} onPointerDown={noop} onResizeStart={noop} />,
      );
      const el = screen.getByTestId('element-img-1');
      expect(el.style.border).toContain('dashed');
    });
  });
});
