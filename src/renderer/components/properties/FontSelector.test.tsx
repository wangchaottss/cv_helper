import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FontSelector from './FontSelector';

// Mock electron API
const mockGetSystemFonts = vi.fn();

beforeEach(() => {
  mockGetSystemFonts.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electronAPI = {
    getSystemFonts: mockGetSystemFonts,
  };
});

describe('FontSelector', () => {
  it('renders with current value', () => {
    mockGetSystemFonts.mockResolvedValue([]);
    render(<FontSelector value="Inter" onChange={vi.fn()} />);
    expect(screen.getByTestId('font-selector-trigger')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    mockGetSystemFonts.mockResolvedValue([]);
    const onChange = vi.fn();
    render(<FontSelector value="Inter" onChange={onChange} />);

    const trigger = screen.getByTestId('font-selector-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('font-selector-dropdown')).toBeInTheDocument();
    });
  });

  it('shows search input in dropdown', async () => {
    mockGetSystemFonts.mockResolvedValue([]);
    render(<FontSelector value="Inter" onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('font-selector-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('font-search-input')).toBeInTheDocument();
    });
  });

  it('is disabled when disabled prop is true', () => {
    mockGetSystemFonts.mockResolvedValue([]);
    render(<FontSelector value="Inter" onChange={vi.fn()} disabled />);
    expect(screen.getByTestId('font-selector-trigger')).toBeDisabled();
  });

  it('shows built-in font options', async () => {
    mockGetSystemFonts.mockResolvedValue([]);
    render(<FontSelector value="Inter" onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('font-selector-trigger'));

    await waitFor(() => {
      // Should find built-in fonts in the dropdown
      expect(screen.getByText('Source Han Sans SC')).toBeInTheDocument();
    });
  });
});
