import type React from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { EChartsWrapper } from './EChartsWrapper'
import { ANT_DESIGN_COLORS } from '../../../types/analytics.types'
import type { ProgressRecord } from '../../../types/analytics.types'
import styles from './ProgressionChart.module.css'

const MASTERY_LEVEL_VALUE: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 }

const MASTERY_LABEL_MAP: Record<number, string> = { 1: 'E', 2: 'D', 3: 'C', 4: 'B', 5: 'A' }

/**
 * ProgressionChart Props
 */
export interface ProgressionChartProps {
  records: ProgressRecord[]
  title?: string
  loading?: boolean
}

/**
 * 知识点进度图表组件
 * 折线+柱状混合图，双Y轴展示掌握程度和学习时长
 */
export const ProgressionChart = ({
  records,
  title,
  loading = false,
}: ProgressionChartProps): React.JSX.Element => {
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const dates = sortedRecords.map(r => r.date)
  const masteryValues = sortedRecords.map(r => MASTERY_LEVEL_VALUE[r.masteryLevel])
  const durationValues = sortedRecords.map(r => r.durationMinutes)

  const lineData = sortedRecords.map(r => ({
    value: MASTERY_LEVEL_VALUE[r.masteryLevel],
    itemStyle: { color: ANT_DESIGN_COLORS.mastery[r.masteryLevel] },
  }))

  const markPoints: Array<{
    coord: [number, number]
    value: string
    itemStyle: { color: string }
  }> = []

  if (sortedRecords.length > 0) {
    markPoints.push({
      coord: [0, masteryValues[0]],
      value: '首次学习',
      itemStyle: { color: ANT_DESIGN_COLORS.warning },
    })

    const firstReachIndex = (targetLevel: string) =>
      sortedRecords.findIndex(r => r.masteryLevel === targetLevel)

    const firstCIndex = firstReachIndex('C')
    if (firstCIndex > 0) {
      markPoints.push({
        coord: [firstCIndex, masteryValues[firstCIndex]],
        value: '首次达到 C',
        itemStyle: { color: ANT_DESIGN_COLORS.warning },
      })
    }

    const firstAIndex = firstReachIndex('A')
    if (firstAIndex > 0 && firstAIndex !== firstCIndex) {
      markPoints.push({
        coord: [firstAIndex, masteryValues[firstAIndex]],
        value: '达到 A',
        itemStyle: { color: ANT_DESIGN_COLORS.warning },
      })
    }
  }

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
        const p = params as Array<{
          name: string
          value: number
          seriesName: string
          dataIndex: number
        }>
        const idx = p[0]?.dataIndex ?? 0
        const record = sortedRecords[idx]
        if (!record) {
          return ''
        }
        const masteryColor = ANT_DESIGN_COLORS.mastery[record.masteryLevel]
        const notesPreview = record.notes
          ? record.notes.slice(0, 50) + (record.notes.length > 50 ? '...' : '')
          : ''

        let result = `<strong>${record.date}</strong><br/>`
        result += `掌握程度: <span style="color:${masteryColor}"><strong>${record.masteryLevel}</strong></span><br/>`
        result += `学习时长: ${record.durationMinutes} 分钟`
        if (notesPreview) {
          result += `<br/>笔记: ${notesPreview}`
        }
        return result
      },
    },
    legend: {
      data: ['掌握程度', '学习时长'],
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
      data: dates,
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
        min: 0.5,
        max: 5.5,
        interval: 1,
        position: 'left',
        axisLabel: {
          formatter: (value: number) => MASTERY_LABEL_MAP[Math.round(value)] ?? '',
        },
        name: '掌握程度',
      },
      {
        type: 'value',
        position: 'right',
        name: '时长(分钟)',
      },
    ],
    series: [
      {
        name: '掌握程度',
        type: 'line',
        data: lineData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: {
          width: 3,
          color: ANT_DESIGN_COLORS.primary,
        },
        markPoint: {
          data: markPoints,
          symbolSize: 60,
          label: {
            fontSize: 10,
          },
        },
      },
      {
        name: '学习时长',
        type: 'bar',
        yAxisIndex: 1,
        data: durationValues,
        itemStyle: {
          color: 'rgba(24, 144, 255, 0.3)',
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  return (
    <div className={styles.chartContainer}>
      <EChartsWrapper option={option} loading={loading} style={{ height: '100%' }} />
    </div>
  )
}

export default ProgressionChart
