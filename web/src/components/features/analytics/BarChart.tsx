import React from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { EChartsWrapper } from './EChartsWrapper';
import { ANT_DESIGN_COLORS } from '../../../types/analytics.types';

/**
 * BarChart Props
 */
export interface BarChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  loading?: boolean;
  horizontal?: boolean;
  xAxisName?: string;
  yAxisName?: string;
}

/**
 * 柱状图组件
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  loading = false,
  horizontal = false,
  xAxisName,
  yAxisName,
}) => {
  const option: EChartsCoreOption = {
    title: title
      ? {
          text: title,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: horizontal
      ? {
          type: 'value',
          name: xAxisName,
        }
      : {
          type: 'category',
          data: data.map((d) => d.name),
          axisLabel: {
            interval: 0,
            rotate: data.length > 10 ? 45 : 0,
          },
          name: xAxisName,
        },
    yAxis: horizontal
      ? {
          type: 'category',
          data: data.map((d) => d.name),
          name: yAxisName,
        }
      : {
          type: 'value',
          name: yAxisName,
        },
    series: [
      {
        type: 'bar',
        data: horizontal ? data.map((d) => d.value).reverse() : data.map((d) => d.value),
        itemStyle: {
          color: ANT_DESIGN_COLORS.primary,
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: '#40a9ff',
          },
        },
      },
    ],
  };

  return <EChartsWrapper option={option} loading={loading} />;
};

export default BarChart;
