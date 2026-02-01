import { useEffect, useRef } from "react";

interface LogViewerProps {
  logs: string[];
}

export default function LogViewer({ logs }: LogViewerProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        处理日志
      </label>
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500">等待开始处理...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
