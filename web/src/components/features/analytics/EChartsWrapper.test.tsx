import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EChartsWrapper } from './EChartsWrapper';

const mockChartInstance = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  setOption: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: () => mockChartInstance,
}));

vi.mock('echarts/charts', () => ({
  BarChart: {},
  LineChart: {},
  PieChart: {},
}));

vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  ToolboxComponent: {},
  DataZoomComponent: {},
}));

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}));

describe('EChartsWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a div element', () => {
    const { container } = render(<EChartsWrapper option={{}} />);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('applies custom style', () => {
    const customStyle: React.CSSProperties = {
      height: '500px',
      backgroundColor: 'red',
    };
    const { container } = render(
      <EChartsWrapper option={{}} style={customStyle} />,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div).toHaveStyle('height: 500px');
    expect(div).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  it('calls onClick when chart is clicked', () => {
    const handleClick = vi.fn();
    render(<EChartsWrapper option={{}} onClick={handleClick} />);

    expect(mockChartInstance.on).toHaveBeenCalledWith('click', handleClick);

    const registeredHandler = mockChartInstance.on.mock
      .calls[0][1] as (params: unknown) => void;
    registeredHandler({ name: 'test' });

    expect(handleClick).toHaveBeenCalledWith({ name: 'test' });
  });

  it('shows loading state', () => {
    render(<EChartsWrapper option={{}} loading={true} />);
    expect(mockChartInstance.showLoading).toHaveBeenCalledWith({
      text: '加载中...',
      color: '#1890FF',
      textColor: '#1890FF',
      maskColor: 'rgba(255, 255, 255, 0.8)',
    });
  });

  it('hides loading when loading becomes false', () => {
    const { rerender } = render(
      <EChartsWrapper option={{}} loading={true} />,
    );
    expect(mockChartInstance.showLoading).toHaveBeenCalledTimes(1);

    rerender(<EChartsWrapper option={{}} loading={false} />);
    expect(mockChartInstance.hideLoading).toHaveBeenCalledTimes(1);
  });
});
