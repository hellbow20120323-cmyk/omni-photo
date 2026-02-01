interface ControlPanelProps {
  moveFiles: boolean;
  onMoveFilesChange: (move: boolean) => void;
  compareWithArchive: boolean;
  onCompareWithArchiveChange: (value: boolean) => void;
  isProcessing: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export default function ControlPanel({
  moveFiles,
  onMoveFilesChange,
  compareWithArchive,
  onCompareWithArchiveChange,
  isProcessing,
  onStart,
  onCancel,
}: ControlPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-6">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            checked={moveFiles}
            onChange={() => onMoveFilesChange(true)}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            移动（清除原片）
          </span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            checked={!moveFiles}
            onChange={() => onMoveFilesChange(false)}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            复制（保留原片）
          </span>
        </label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="compare-with-archive"
          checked={compareWithArchive}
          onChange={(e) => onCompareWithArchiveChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="compare-with-archive" className="text-sm font-medium text-gray-700">
          与归档库一起比较去重（收件箱 + 归档库内已有文件均参与去重）
        </label>
      </div>

      <div className="flex justify-center">
        {isProcessing ? (
          <button
            onClick={onCancel}
            className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            取消任务
          </button>
        ) : (
          <button
            onClick={onStart}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
          >
            开始整理
          </button>
        )}
      </div>
    </div>
  );
}
