import React from 'react';
import type { EChartsOption } from 'echarts/core';
import { EChartsWrapper } from './EChartsWrapper';
import { ANT_DESIGN_COLORS } from '../../../types/analytics.types';

/**
 * PieChart Props
 */
export interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  loading?: boolean;
  donut?: boolean;
  showLegend?: boolean;
}

/**
 * 饼图组件
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  loading = false,
  donut = false,
  showLegend = true,
}) => {
  const option: EChartsOption = {
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
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: showLegend
      ? {
          orient: 'vertical',
          right: '5%',
          top: 'center',
        }
      : undefined,
    series: [
      {
        type: 'pie',
        radius: donut ? ['40%', '70%'] : '60%',
        center: ['40%', '50%'],
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
        },
        itemStyle: {
          borderRadius: donut ? 8 : 0,
          borderColor: '#fff',
          borderWidth: 2,
        },
      },
    ],
    color: [
      ANT_DESIGN_COLORS.mastery.A,
      ANT_DESIGN_COLORS.mastery.B,
      ANT_DESIGN_COLORS.mastery.C,
      ANT_DESIGN_COLORS.mastery.D,
      ANT_DESIGN_COLORS.mastery.E,
    ],
  };

  return <EChartsWrapper option={option} loading={loading} />;
};

export default PieChart;
