import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";

interface DirectorySelectorProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
}

export default function DirectorySelector({
  label,
  value,
  onChange,
  placeholder = "选择目录",
}: DirectorySelectorProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleSelect = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: `选择${label}`,
    });

    if (selected && typeof selected === "string") {
      onChange(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // 注意：浏览器环境中的拖拽可能无法直接获取路径
      // 这里需要用户通过按钮选择
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 truncate">
              {value || placeholder}
            </p>
          </div>
          <button
            onClick={handleSelect}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            选择目录
          </button>
        </div>
      </div>
    </div>
  );
}
