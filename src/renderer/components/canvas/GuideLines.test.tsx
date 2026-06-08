import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuideLines from './GuideLines';
import { useEditorStore } from '../../store/editorStore';

describe('GuideLines', () => {
  beforeEach(() => {
    useEditorStore.setState({
      elements: {},
      selection: [],
      zoom: 1,
      showGuides: true,
      snapEnabled: true,
      guideLines: { horizontal: [], vertical: [] },
      _history: [],
      _future: [],
    });
  });

  it('renders nothing when no guide lines', () => {
    const { container } = render(<GuideLines />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when showGuides is false', () => {
    useEditorStore.setState({ showGuides: false });
    useEditorStore.getState().setGuideLines({ horizontal: [100], vertical: [200] });

    const { container } = render(<GuideLines />);
    expect(container.firstChild).toBeNull();
  });

  it('renders horizontal guide lines', () => {
    useEditorStore.getState().setGuideLines({ horizontal: [100, 300], vertical: [] });

    render(<GuideLines />);
    expect(screen.getByTestId('guide-h-100')).toBeInTheDocument();
    expect(screen.getByTestId('guide-h-300')).toBeInTheDocument();
  });

  it('renders vertical guide lines', () => {
    useEditorStore.getState().setGuideLines({ horizontal: [], vertical: [200, 400] });

    render(<GuideLines />);
    expect(screen.getByTestId('guide-v-200')).toBeInTheDocument();
    expect(screen.getByTestId('guide-v-400')).toBeInTheDocument();
  });
});
