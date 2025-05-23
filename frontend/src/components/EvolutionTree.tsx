import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface LifeformNode {
  id: string;
  parent?: string;
  generation: number;
  traits: {
    color: string;
    size: number;
    speed: number;
    pattern: string;
  };
  birthTime: number;
  children?: LifeformNode[];
}

interface HierarchyNode extends d3.HierarchyNode<LifeformNode> {
  x: number;
  y: number;
}

const EvolutionTree: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [treeData, setTreeData] = useState<LifeformNode[]>([
    {
      id: 'root',
      generation: 0,
      traits: { color: '#ffffff', size: 1.0, speed: 1.0, pattern: 'wave' },
      birthTime: Date.now(),
      children: [
        {
          id: 'child1',
          parent: 'root',
          generation: 1,
          traits: { color: '#ff6b6b', size: 1.2, speed: 1.1, pattern: 'spiral' },
          birthTime: Date.now() + 1000
        },
        {
          id: 'child2',
          parent: 'root',
          generation: 1,
          traits: { color: '#4ecdc4', size: 0.8, speed: 1.3, pattern: 'wave' },
          birthTime: Date.now() + 2000
        }
      ]
    }
  ]);

  const [selectedNode, setSelectedNode] = useState<LifeformNode | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // ツリーレイアウトを作成
    const treeLayout = d3.tree<LifeformNode>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom]);

    // データを階層構造に変換
    const root = d3.hierarchy(treeData[0]);
    const treeNodes = treeLayout(root) as HierarchyNode;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // リンク（枝）を描画
    g.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<any, LifeformNode>()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
      )
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', 2);

    // ノード（生命体）を描画
    const nodes = g.selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_: any, d: any) => setSelectedNode(d.data));

    // ノードの円を描画
    nodes.append('circle')
      .attr('r', d => 8 + d.data.traits.size * 5)
      .style('fill', d => d.data.traits.color)
      .style('stroke', '#333')
      .style('stroke-width', 2)
      .style('opacity', 0.8);

    // ノードのラベルを描画
    nodes.append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#333')
      .text(d => `Gen ${d.data.generation}`);

    // パターンインジケーター
    nodes.append('text')
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(d => d.data.traits.pattern === 'wave' ? '〜' : '◉');

  }, [treeData]);

  const addEvolution = () => {
    // ランダムな進化を追加
    const newLifeform: LifeformNode = {
      id: `evolution_${Date.now()}`,
      parent: 'child1',
      generation: 2,
      traits: {
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.5 + Math.random() * 2,
        pattern: Math.random() > 0.5 ? 'wave' : 'spiral'
      },
      birthTime: Date.now()
    };

    setTreeData(prev => {
      const updated = [...prev];
      if (updated[0].children && updated[0].children[0]) {
        if (!updated[0].children[0].children) {
          updated[0].children[0].children = [];
        }
        updated[0].children[0].children.push(newLifeform);
      }
      return updated;
    });
  };

  const resetTree = () => {
    setTreeData([{
      id: 'root',
      generation: 0,
      traits: { color: '#ffffff', size: 1.0, speed: 1.0, pattern: 'wave' },
      birthTime: Date.now(),
      children: []
    }]);
    setSelectedNode(null);
  };

  return (
    <div className="evolution-tree">
      <h3>🌳 Evolution Tree</h3>
      
      <div className="tree-container">
        <svg ref={svgRef}></svg>
      </div>

      <div className="tree-controls">
        <button onClick={addEvolution}>
          🧬 Trigger Evolution
        </button>
        <button onClick={resetTree}>
          🔄 Reset Tree
        </button>
      </div>

      {selectedNode && (
        <div className="node-details">
          <h4>Selected Lifeform</h4>
          <div className="trait-list">
            <div>Generation: {selectedNode.generation}</div>
            <div>Size: {selectedNode.traits.size.toFixed(2)}</div>
            <div>Speed: {selectedNode.traits.speed.toFixed(2)}</div>
            <div>Pattern: {selectedNode.traits.pattern}</div>
            <div>
              Color: 
              <span 
                className="color-sample"
                style={{ backgroundColor: selectedNode.traits.color }}
              />
            </div>
            <div>Born: {new Date(selectedNode.birthTime).toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      <div className="tree-stats">
        <div>Total Nodes: {countNodes(treeData[0])}</div>
        <div>Max Generation: {getMaxGeneration(treeData[0])}</div>
      </div>
    </div>
  );
};

// ヘルパー関数
const countNodes = (node: LifeformNode): number => {
  let count = 1;
  if (node.children) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  return count;
};

const getMaxGeneration = (node: LifeformNode): number => {
  let maxGen = node.generation;
  if (node.children) {
    maxGen = Math.max(maxGen, ...node.children.map(getMaxGeneration));
  }
  return maxGen;
};

export default EvolutionTree;
