import type { KnowledgePoint, KnowledgeTreeNode } from '../types/knowledge.types';

/**
 * 将后端返回的扁平知识点列表转换为树形结构
 * 按 code 层级关系建立父子树（a → a.b → a.b.c）
 * @param points 知识点列表（包含一、二、三级）
 * @returns 知识树节点列表
 */
export function convertToTreeData(points: KnowledgePoint[]): KnowledgeTreeNode[] {
  // 按 code 层级排序，确保父节点在子节点之前处理
  const sorted = [...points].sort((a, b) => {
    const levelDiff = a.code.split('.').length - b.code.split('.').length;
    if (levelDiff !== 0) return levelDiff;
    return a.code.localeCompare(b.code);
  });

  const codeToNode = new Map<string, KnowledgeTreeNode>();
  const rootNodes: KnowledgeTreeNode[] = [];

  for (const point of sorted) {
    const codeParts = point.code.split('.');
    const level = codeParts.length;

    const node: KnowledgeTreeNode = {
      key: point.id,
      title: point.level3 || point.level2 || point.level1,
      code: point.code,
      importanceLevel: point.importanceLevel,
      isLeaf: level >= 3,
      data: point,
    };

    codeToNode.set(point.code, node);

    // 找父节点：去掉最后一段 code
    if (codeParts.length > 1) {
      const parentCode = codeParts.slice(0, -1).join('.');
      const parent = codeToNode.get(parentCode);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        // 父节点不再是叶子
        parent.isLeaf = false;
      } else {
        // 父节点不存在（数据不完整），作为根节点
        rootNodes.push(node);
      }
    } else {
      // 一级节点，作为根
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

/**
 * 在树中查找节点
 * @param tree 树数据
 * @param key 节点 key
 * @returns 找到的节点或 null
 */
export function findNodeInTree(tree: KnowledgeTreeNode[], key: string): KnowledgeTreeNode | null {
  for (const node of tree) {
    if (node.key === key) {
      return node;
    }
    if (node.children) {
      const found = findNodeInTree(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 获取所有节点的 key（用于展开全部）
 * @param tree 树数据
 * @returns 所有节点 key 列表
 */
export function getAllNodeKeys(tree: KnowledgeTreeNode[]): string[] {
  const keys: string[] = [];

  function traverse(nodes: KnowledgeTreeNode[]) {
    nodes.forEach((node) => {
      keys.push(node.key);
      if (node.children) {
        traverse(node.children);
      }
    });
  }

  traverse(tree);
  return keys;
}

/**
 * 按关键词过滤树
 * @param tree 树数据
 * @param keyword 关键词
 * @returns 过滤后的树
 */
export function filterTreeByKeyword(tree: KnowledgeTreeNode[], keyword: string): KnowledgeTreeNode[] {
  if (!keyword.trim()) return tree;

  const lowerKeyword = keyword.toLowerCase();

  function filterNode(node: KnowledgeTreeNode): KnowledgeTreeNode | null {
    const matches = node.title.toLowerCase().includes(lowerKeyword) ||
                   node.code.toLowerCase().includes(lowerKeyword);

    if (matches) {
      return node;
    }

    if (node.children) {
      const filteredChildren = node.children
        .map((child) => filterNode(child))
        .filter((child): child is KnowledgeTreeNode => child !== null);

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
    }

    return null;
  }

  return tree
    .map((node) => filterNode(node))
    .filter((node): node is KnowledgeTreeNode => node !== null);
}
