import React, { useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ExploreGraphProps {
  onBack?: () => void;
  theme?: string | null;
  onOpenVerse?: (surah: number, verse: number) => void;
}

export default function ExploreGraph({ onBack, theme, onOpenVerse }: ExploreGraphProps) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Read theme from the URL
  const selectedTheme = theme;

  useEffect(() => {
    // 2. Fetch graph data from /api/graph-data
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/graph-data');
        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }
        const data = await response.json();
        setGraphData(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const handleNodeClick = (node: any) => {
    if (node.type === 'verse' && onOpenVerse) {
      const [surah, verse] = node.id.split(":").map(Number);
      onOpenVerse(surah, verse);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 4. Page layout: Top section */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Explore Quran Connections
        </h1>
        {selectedTheme && (
          <p className="text-stone-500 dark:text-zinc-400 mt-2">
            Highlighting theme: <span className="font-semibold text-emerald-600 dark:text-emerald-500">{selectedTheme}</span>
          </p>
        )}
      </div>

      {/* 9. The graph container should use: height: 80vh */}
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-200/60 dark:border-zinc-800 overflow-hidden w-full" 
        style={{ height: '80vh' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : (
          /* 5. Render graph using: <ForceGraph2D /> */
          <ForceGraph2D
            graphData={graphData}
            /* 6. Node styling */
            nodeColor={(node: any) => {
              if (node.id === selectedTheme) return '#22c55e';
              return node.type === 'theme' ? '#10b981' : '#9ca3af';
            }}
            nodeVal={(node: any) => node.type === 'theme' ? 10 : 5} // size 10 for theme, 5 for verse
            nodeLabel="id"
            onNodeClick={handleNodeClick}
            /* 8. Graph must support mobile: drag nodes, pinch zoom, tap nodes */
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            cooldownTicks={100}
          />
        )}
      </div>
    </div>
  );
}
