interface ProgressBarProps {
  current: number;
  total: number;
  stats: {
    photos: number;
    videos: number;
    others: number;
    duplicates: number;
    errors: number;
    processed: number;
    total_duplicate_size: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ProgressBar({ current, total, stats }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">处理进度</span>
        <span className="text-sm text-gray-600">
          {current} / {total} ({percentage.toFixed(1)}%)
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-blue-600 font-semibold">照片</div>
          <div className="text-2xl font-bold text-blue-800">{stats.photos}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-purple-600 font-semibold">视频</div>
          <div className="text-2xl font-bold text-purple-800">{stats.videos}</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-green-600 font-semibold">已处理</div>
          <div className="text-2xl font-bold text-green-800">{stats.processed}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-yellow-50 p-3 rounded">
          <div className="text-yellow-600 font-semibold">重复</div>
          <div className="text-xl font-bold text-yellow-800">{stats.duplicates}</div>
          {stats.total_duplicate_size > 0 && (
            <div className="text-xs text-yellow-700 mt-1">
              占用: {formatBytes(stats.total_duplicate_size)}
            </div>
          )}
        </div>
        <div className="bg-red-50 p-3 rounded">
          <div className="text-red-600 font-semibold">错误</div>
          <div className="text-xl font-bold text-red-800">{stats.errors}</div>
        </div>
      </div>
    </div>
  );
}
