import React from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { EChartsWrapper } from './EChartsWrapper';
import { ANT_DESIGN_COLORS } from '../../../types/analytics.types';

/**
 * LineChart Props
 */
export interface LineChartProps {
  data: Array<{ date: string; value: number; count?: number }>;
  title?: string;
  loading?: boolean;
  showArea?: boolean;
  yAxisName?: string;
}

/**
 * 折线图组件
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  loading = false,
  showArea = true,
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
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number; seriesName: string }>;
        let result = `${p[0].name}<br/>`;
        p.forEach((item) => {
          result += `${item.seriesName}: ${item.value}<br/>`;
        });
        return result;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => d.date),
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
    },
    series: [
      {
        name: '学习时长(分钟)',
        type: 'line',
        data: data.map((d) => d.value),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: ANT_DESIGN_COLORS.primary,
          width: 3,
        },
        itemStyle: {
          color: ANT_DESIGN_COLORS.primary,
        },
        areaStyle: showArea
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                  { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
                ],
              },
            }
          : undefined,
      },
    ],
  };

  return <EChartsWrapper option={option} loading={loading} />;
};

export default LineChart;
