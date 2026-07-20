import React from 'react'
import { Collapse, Typography } from 'antd'

const { Panel } = Collapse

export const ValidationRulesPanel: React.FC = () => {
  return (
    <Collapse defaultActiveKey={['xlsx', 'md']} ghost>
      <Panel header="框架文件 (.xlsx) 校验规范" key="xlsx">
        <Typography.Paragraph>
          <ul>
            <li>必须包含列：知识点编号 / 编号 / code，以及一级知识点 / 一级 / level1。</li>
            <li>知识点编号必须是数字层级格式，例如 1.1 或 1.1.1。</li>
            <li>同一文件中不能出现重复的知识点编号。</li>
            <li>新编号不能与当前教材数据库中已有的知识点编号冲突。</li>
            <li>每个编号的上级编号必须在数据库中已存在。</li>
          </ul>
        </Typography.Paragraph>
      </Panel>
      <Panel header="内容文件 (.md) 校验规范" key="md">
        <Typography.Paragraph>
          <ul>
            <li>文件不能为空。</li>
            <li>md 中出现的每个知识点编号必须在已上传的 xlsx 中存在。</li>
            <li>二级知识点编号应使用 ### 标题，三级知识点编号应使用 #### 标题。</li>
          </ul>
        </Typography.Paragraph>
      </Panel>
    </Collapse>
  )
}
