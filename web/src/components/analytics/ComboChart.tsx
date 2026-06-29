import React from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { EChartsWrapper } from '../features/analytics/EChartsWrapper'
import { ANT_DESIGN_COLORS } from '../../types/analytics.types'

export interface ComboChartDataPoint {
  date: string
  durationMinutes: number
  count: number
}

export interface ComboChartProps {
  data: ComboChartDataPoint[]
  loading?: boolean
}

export const ComboChart: React.FC<ComboChartProps> = ({ data, loading = false }) => {
  const option: EChartsCoreOption = React.useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['学习时长', '学习次数'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date),
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '时长(分钟)',
          position: 'left',
        },
        {
          type: 'value',
          name: '次数',
          position: 'right',
          minInterval: 1,
        },
      ],
      series: [
        {
          name: '学习时长',
          type: 'line',
          data: data.map(d => d.durationMinutes),
          smooth: true,
          itemStyle: { color: ANT_DESIGN_COLORS.primary },
          areaStyle: {
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
          },
        },
        {
          name: '学习次数',
          type: 'bar',
          yAxisIndex: 1,
          data: data.map(d => d.count),
          itemStyle: {
            color: 'rgba(250, 173, 20, 0.7)',
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    }),
    [data]
  )

  return <EChartsWrapper option={option} loading={loading} />
}
