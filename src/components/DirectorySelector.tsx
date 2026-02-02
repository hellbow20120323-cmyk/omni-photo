import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";

type DropTargetId = "source" | "target";

interface DirectorySelectorProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  /** 用于 Tauri 原生拖放：标识此选择器（收件箱/归档库） */
  dropTargetId?: DropTargetId;
  /** 当前悬停的拖放目标，用于高亮 */
  dropTarget?: DropTargetId | null;
  /** 拖拽进入/离开时通知父组件，以便 drop 时写入对应输入 */
  onDropTargetChange?: (id: DropTargetId | null) => void;
}

export default function DirectorySelector({
  label,
  value,
  onChange,
  placeholder = "选择目录",
  dropTargetId,
  dropTarget,
  onDropTargetChange,
}: DirectorySelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isActiveDropTarget = dropTargetId != null && dropTarget === dropTargetId;

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
    if (dropTargetId != null) onDropTargetChange?.(dropTargetId);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    if (dropTargetId != null) onDropTargetChange?.(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onDropTargetChange?.(null);
    // 实际路径由 Tauri appWindow.onFileDropEvent 提供并写入，此处仅阻止默认行为
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging || isActiveDropTarget
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
