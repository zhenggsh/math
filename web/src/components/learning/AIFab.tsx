import React, { useState, useCallback } from 'react'
import { Button } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { StudyAgentPanel } from './StudyAgentPanel'
import styles from './AIFab.module.css'

export interface AIFabProps {
  knowledgePointId?: string
  knowledgePointTitle?: string
}

export const AIFab: React.FC<AIFabProps> = ({ knowledgePointId, knowledgePointTitle }) => {
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<RobotOutlined />}
        onClick={handleOpen}
        className={styles.fabButton}
        aria-label="AI 助手"
      />
      {knowledgePointId && knowledgePointTitle && (
        <StudyAgentPanel
          open={open}
          onClose={handleClose}
          knowledgePointId={knowledgePointId}
          knowledgePointTitle={knowledgePointTitle}
        />
      )}
    </>
  )
}

export default AIFab
