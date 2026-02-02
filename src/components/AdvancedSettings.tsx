import type { Dispatch, SetStateAction } from "react";

interface AdvancedOptions {
  preserveTopLevelDir: boolean;
  photoExtensionsInput: string;
  videoExtensionsInput: string;
}

interface AdvancedSettingsProps {
  value: AdvancedOptions;
  onChange: Dispatch<SetStateAction<AdvancedOptions>>;
}

export default function AdvancedSettings({ value, onChange }: AdvancedSettingsProps) {
  const handleTogglePreserve = (checked: boolean) => {
    onChange((prev) => ({
      ...prev,
      preserveTopLevelDir: checked,
    }));
  };

  const handlePhotoExtChange = (text: string) => {
    onChange((prev) => ({
      ...prev,
      photoExtensionsInput: text,
    }));
  };

  const handleVideoExtChange = (text: string) => {
    onChange((prev) => ({
      ...prev,
      videoExtensionsInput: text,
    }));
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">高级配置</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            可选：保留源目录一级目录结构，及自定义照片 / 视频扩展名。
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="preserve-top-level-dir"
          checked={value.preserveTopLevelDir}
          onChange={(e) => handleTogglePreserve(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="preserve-top-level-dir" className="text-sm text-gray-700">
          保留源目录的一级目录结构：
          <span className="block text-xs text-gray-500">
            例如 <code className="rounded bg-gray-100 px-1 py-0.5">相册A/IMG_0001.jpg</code>{" "}
            会整理到 <code className="rounded bg-gray-100 px-1 py-0.5">归档库/相册A/Photos/年/月/…</code>；
            根目录下的文件（无子目录）统一放入{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5">Inbox_Direct/&lt;类型&gt;/年/月/…</code>。
          </span>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="photo-exts" className="block text-xs font-medium text-gray-700">
            照片扩展名
          </label>
          <input
            id="photo-exts"
            type="text"
            value={value.photoExtensionsInput}
            onChange={(e) => handlePhotoExtChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="例如：jpg, jpeg, png, heic"
          />
          <p className="text-xs text-gray-500">
            以逗号或空格分隔；不区分大小写；留空则使用内置默认列表。
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="video-exts" className="block text-xs font-medium text-gray-700">
            视频扩展名
          </label>
          <input
            id="video-exts"
            type="text"
            value={value.videoExtensionsInput}
            onChange={(e) => handleVideoExtChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="例如：mp4, mov, avi, mkv"
          />
          <p className="text-xs text-gray-500">
            同上；仅影响“照片 / 视频 / 其他”分类，不改变去重逻辑。
          </p>
        </div>
      </div>
    </div>
  );
}

