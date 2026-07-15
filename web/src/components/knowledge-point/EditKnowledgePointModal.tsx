import React, { useMemo } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type { UpdateKnowledgePointDto } from '../../types/knowledge-point.types'

const IMPORTANCE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]

export interface EditKnowledgePointFormValues extends UpdateKnowledgePointDto {
  code?: string
  name?: string
}

export interface EditKnowledgePointModalProps {
  open: boolean
  initialValues: EditKnowledgePointFormValues
  onCancel: () => void
  onSubmit: (dto: EditKnowledgePointFormValues) => void | Promise<void>
  loading?: boolean
}

export const EditKnowledgePointModal: React.FC<EditKnowledgePointModalProps> = ({
  open,
  initialValues,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm<EditKnowledgePointFormValues>()

  const formInitialValues = useMemo(
    () => ({
      code: initialValues.code ?? '',
      name: initialValues.name ?? '',
      definition: initialValues.definition ?? '',
      characteristics: initialValues.characteristics ?? '',
      importanceLevel: initialValues.importanceLevel ?? 'C',
    }),
    [initialValues]
  )

  const handleOk = (): void => {
    void form
      .validateFields()
      .then(async values => {
        await onSubmit(values)
      })
      .catch(() => {
        // 校验失败时保持弹窗打开，不抛未处理异常
      })
  }

  return (
    <Modal
      title="编辑知识点概要"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false} initialValues={formInitialValues}>
        <Form.Item
          label="编号"
          name="code"
          rules={[
            { required: true, message: '请输入编号' },
            { max: 50, message: '编号最多 50 字符' },
          ]}
        >
          <Input placeholder="如 1.1.1" />
        </Form.Item>
        <Form.Item
          label="名称"
          name="name"
          rules={[
            { required: true, message: '请输入名称' },
            { max: 200, message: '名称最多 200 字符' },
          ]}
        >
          <Input placeholder="知识点名称" />
        </Form.Item>
        <Form.Item
          label="定义"
          name="definition"
          rules={[
            { required: true, message: '请输入定义' },
            { max: 2000, message: '定义最多 2000 字符' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="知识点定义" />
        </Form.Item>
        <Form.Item
          label="特性"
          name="characteristics"
          rules={[
            { required: true, message: '请输入特性' },
            { max: 2000, message: '特性最多 2000 字符' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="知识点特性" />
        </Form.Item>
        <Form.Item
          label="重要性"
          name="importanceLevel"
          rules={[{ required: true, message: '请选择重要性' }]}
        >
          <Select options={IMPORTANCE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EditKnowledgePointModal
