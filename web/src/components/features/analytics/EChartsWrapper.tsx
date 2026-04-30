import React, { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts/core';
import type { EChartsOption, ECharts } from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册必要的组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

/**
 * EChartsWrapper Props
 */
export interface EChartsWrapperProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  onClick?: (params: unknown) => void;
  loading?: boolean;
}

/**
 * ECharts 通用容器组件
 * 处理初始化、销毁、响应式
 */
export const EChartsWrapper: React.FC<EChartsWrapperProps> = ({
  option,
  style,
  onClick,
  loading = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    // 绑定点击事件
    if (onClick) {
      chartInstance.current.on('click', onClick);
    }

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [onClick]);

  // 更新配置
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(option, true);
    }
  }, [option]);

  // 加载状态
  useEffect(() => {
    if (chartInstance.current) {
      if (loading) {
        chartInstance.current.showLoading({
          text: '加载中...',
          color: '#1890FF',
          textColor: '#1890FF',
          maskColor: 'rgba(255, 255, 255, 0.8)',
        });
      } else {
        chartInstance.current.hideLoading();
      }
    }
  }, [loading]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '300px',
        ...style,
      }}
    />
  );
};

export default EChartsWrapper;
