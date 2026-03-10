'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface VerseNodeData extends Record<string, unknown> {
  label: string;
  surah: number;
  verse: number;
  text: string;
}

interface VerseGraphProps {
  initialVerse: {
    id: number;
    surah: number;
    verse: number;
    text: string;
  };
  relationships: {
    target_verse_id: number;
    target_surah: number;
    target_verse: number;
    target_text: string;
    similarity_score: number;
    ai_explanation: string;
  }[];
  onNodeClick?: (surah: number, verse: number) => void;
}

export default function VerseGraph({ initialVerse, relationships, onNodeClick }: VerseGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<VerseNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    // Initialize graph with the central verse and its immediate relationships
    const initialNodes: Node<VerseNodeData>[] = [
      {
        id: initialVerse.id.toString(),
        position: { x: 400, y: 300 },
        data: {
          label: `${initialVerse.surah}:${initialVerse.verse}`,
          surah: initialVerse.surah,
          verse: initialVerse.verse,
          text: initialVerse.text,
        },
        style: {
          background: '#059669', // emerald-600
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px',
          fontWeight: 'bold',
          width: 120,
          textAlign: 'center',
        },
      },
    ];

    const initialEdges: Edge[] = [];

    // Position related nodes in a circle around the central node
    const radius = 250;
    const angleStep = (2 * Math.PI) / relationships.length;

    relationships.forEach((rel, index) => {
      const angle = index * angleStep;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      initialNodes.push({
        id: rel.target_verse_id.toString(),
        position: { x, y },
        data: {
          label: `${rel.target_surah}:${rel.target_verse}`,
          surah: rel.target_surah,
          verse: rel.target_verse,
          text: rel.target_text,
        },
        style: {
          background: '#ffffff',
          color: '#1c1917', // stone-900
          border: '1px solid #e7e5e4', // stone-200
          borderRadius: '8px',
          padding: '10px',
          width: 120,
          textAlign: 'center',
        },
      });

      initialEdges.push({
        id: `e${initialVerse.id}-${rel.target_verse_id}`,
        source: initialVerse.id.toString(),
        target: rel.target_verse_id.toString(),
        animated: rel.similarity_score > 0.85, // Animate strong relationships
        label: `${(rel.similarity_score * 100).toFixed(1)}%`,
        style: { stroke: rel.similarity_score > 0.85 ? '#059669' : '#a8a29e' },
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialVerse, relationships, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data) {
        onNodeClick(node.data.surah as number, node.data.verse as number);
      }
    },
    [onNodeClick]
  );

  return (
    <div style={{ width: '100%', height: '600px' }} className="rounded-2xl border border-stone-200 dark:border-zinc-800 overflow-hidden bg-stone-50 dark:bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 fill-stone-700 dark:fill-stone-300" />
        <MiniMap 
          nodeColor={(node) => {
            return node.id === initialVerse.id.toString() ? '#059669' : '#e7e5e4';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white dark:bg-zinc-900"
        />
        <Background color="#a8a29e" gap={16} />
      </ReactFlow>
    </div>
  );
}
