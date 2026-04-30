import type { KnowledgePoint, KnowledgeTreeNode } from '../types/knowledge.types';

/**
 * 将后端返回的扁平知识点列表转换为树形结构
 * @param points 知识点列表
 * @returns 知识树节点列表
 */
export function convertToTreeData(points: KnowledgePoint[]): KnowledgeTreeNode[] {
  // 按 level1, level2, level3 分组
  const level1Map = new Map<string, KnowledgePoint[]>();
  
  points.forEach((point) => {
    const level1 = point.level1 || 'Uncategorized';
    if (!level1Map.has(level1)) {
      level1Map.set(level1, []);
    }
    level1Map.get(level1)!.push(point);
  });

  // 构建树形结构
  const tree: KnowledgeTreeNode[] = [];
  
  level1Map.forEach((level1Points, level1Name) => {
    // 按 level2 分组
    const level2Map = new Map<string, KnowledgePoint[]>();
    
    level1Points.forEach((point) => {
      const level2 = point.level2 || '';
      if (!level2Map.has(level2)) {
        level2Map.set(level2, []);
      }
      level2Map.get(level2)!.push(point);
    });

    // 构建二级节点
    const level2Children: KnowledgeTreeNode[] = [];
    
    level2Map.forEach((level2Points, level2Name) => {
      if (level2Name === '') {
        // 没有二级分类，直接添加三级节点
        level2Points.forEach((point) => {
          level2Children.push(createLeafNode(point));
        });
      } else {
        // 创建二级节点
        const level2Node: KnowledgeTreeNode = {
          key: `l2-${level1Name}-${level2Name}`,
          title: level2Name,
          code: level2Points[0]?.code || '',
          importanceLevel: getMostImportantLevel(level2Points),
          children: level2Points.map((point) => createLeafNode(point)),
          data: level2Points[0],
        };
        level2Children.push(level2Node);
      }
    });

    // 创建一级节点
    const level1Node: KnowledgeTreeNode = {
      key: `l1-${level1Name}`,
      title: level1Name,
      code: level1Points[0]?.code || '',
      importanceLevel: getMostImportantLevel(level1Points),
      children: level2Children,
      data: level1Points[0],
    };
    
    tree.push(level1Node);
  });

  return tree;
}

/**
 * 创建叶子节点
 */
function createLeafNode(point: KnowledgePoint): KnowledgeTreeNode {
  return {
    key: point.id,
    title: point.level3 || point.level2 || point.level1,
    code: point.code,
    importanceLevel: point.importanceLevel,
    isLeaf: true,
    data: point,
  };
}

/**
 * 获取最重要的级别
 */
function getMostImportantLevel(points: KnowledgePoint[]): 'A' | 'B' | 'C' {
  if (points.some((p) => p.importanceLevel === 'A')) return 'A';
  if (points.some((p) => p.importanceLevel === 'B')) return 'B';
  return 'C';
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
