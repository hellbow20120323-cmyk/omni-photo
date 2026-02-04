import { useEffect, useRef } from "react";

interface LogViewerProps {
  logs: string[];
}

export default function LogViewer({ logs }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // 当用户滚动到顶部/中间时，不再自动跟踪最新日志；只有在接近底部时才自动滚动
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const threshold = 40; // 小于 40px 认为在底部附近
      isAtBottomRef.current = distanceToBottom < threshold;
    };

    // 初始化一次状态
    handleScroll();
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        处理日志
      </label>
      <div
        ref={containerRef}
        className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">等待开始处理...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
