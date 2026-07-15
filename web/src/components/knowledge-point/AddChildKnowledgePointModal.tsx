import React, { useEffect, useMemo } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type {
  ParentKnowledgeNode,
  CreateKnowledgePointDto,
} from '../../types/knowledge-point.types'

const IMPORTANCE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]

export interface AddChildKnowledgePointModalProps {
  open: boolean
  parentNode: ParentKnowledgeNode | null
  existingCodes: string[]
  onCancel: () => void
  onSubmit: (dto: CreateKnowledgePointDto) => void | Promise<void>
  loading?: boolean
}

export const AddChildKnowledgePointModal: React.FC<AddChildKnowledgePointModalProps> = ({
  open,
  parentNode,
  existingCodes,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm<CreateKnowledgePointDto>()

  const defaultCode = useMemo(() => {
    if (!parentNode) return ''
    const parentCode = parentNode.code
    const prefix = `${parentCode}.`
    const existingSiblings = existingCodes
      .filter(code => code.startsWith(prefix))
      .map(code => Number(code.replace(prefix, '')))
      .filter(n => Number.isFinite(n))
    const maxSibling = existingSiblings.length > 0 ? Math.max(...existingSiblings) : 0
    return `${prefix}${maxSibling + 1}`
  }, [parentNode, existingCodes])

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        code: defaultCode,
        importanceLevel: 'C',
      })
    }
  }, [open, defaultCode, form])

  const handleOk = (): void => {
    void form.validateFields().then(async values => {
      if (!parentNode) return
      await onSubmit({
        ...values,
        parentId: parentNode.id,
      })
      form.resetFields()
    })
  }

  return (
    <Modal
      title="新增子知识点"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="编号"
          name="code"
          rules={[
            { required: true, message: '请输入编号' },
            { max: 50, message: '编号最多 50 字符' },
          ]}
        >
          <Input placeholder="如 1.1.4" />
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
          rules={[{ max: 2000, message: '定义最多 2000 字符' }]}
        >
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
        <Form.Item
          label="特性"
          name="characteristics"
          rules={[{ max: 2000, message: '特性最多 2000 字符' }]}
        >
          <Input.TextArea rows={3} placeholder="可选" />
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

export default AddChildKnowledgePointModal
