import type { Dispatch, SetStateAction } from "react";
import { BilingualStack, BilingualInline, BilingualButtonLabel } from "./Bilingual";
import { useDisplayMode } from "../context/DisplayModeContext";

interface AdvancedOptions {
  preserveTopLevelDir: boolean;
  archiveByDay: boolean;
  photoExtensionsInput: string;
  videoExtensionsInput: string;
}

interface AdvancedSettingsProps {
  value: AdvancedOptions;
  onChange: Dispatch<SetStateAction<AdvancedOptions>>;
  onSave: () => void;
  isDirty?: boolean;
}

export default function AdvancedSettings({
  value,
  onChange,
  onSave,
  isDirty,
}: AdvancedSettingsProps) {
  const { mode } = useDisplayMode();
  const handleToggleArchiveByDay = (checked: boolean) => {
    onChange((prev) => ({
      ...prev,
      archiveByDay: checked,
    }));
  };

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
    <div className="glass-panel-subtle space-y-4 rounded-2xl border border-dashed border-white/25 p-6">
      <div>
        <h2 className="text-sm font-medium text-sea-950">
          <BilingualInline
            en="Advanced organizing rules"
            zh="高级整理规则"
            primaryClassName="font-medium text-sea-950"
            secondaryClassName="text-xs font-normal text-sea-800/60"
          />
        </h2>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="preserve-top-level-dir"
          checked={value.preserveTopLevelDir}
          onChange={(e) => handleTogglePreserve(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/40 bg-white/30 text-sea-700"
        />
        <label htmlFor="preserve-top-level-dir" className="cursor-pointer text-sm text-sea-900/90">
          <BilingualStack
            en="Keep folder-based categories"
            zh="保持文件夹分类结构"
            primaryClassName="font-medium text-sea-900"
            secondaryClassName="text-xs font-normal text-sea-800/65 mt-1"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-sea-800/72">
            <BilingualStack
              en='When enabled, files are archived using folder names from your "path to organize".'
              zh="开启后，文件将按「待整理目录」里的文件夹名称进行归档。"
              primaryClassName="text-sea-800/78"
              secondaryClassName="text-[11px] text-sea-800/58 mt-1"
            />
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-sea-800/68">
            <BilingualStack
              en="For example: /Album A/photo.jpg → stays under /Archive/Album A/… after organizing."
              zh="例如：/相册A/照片.jpg 归档后会保留在 /归档/相册A/... 下。"
              primaryClassName="text-sea-800/75"
              secondaryClassName="text-[11px] text-sea-800/60 mt-0.5"
            />
          </p>
        </label>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="archive-by-day"
          checked={value.archiveByDay}
          onChange={(e) => handleToggleArchiveByDay(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/40 bg-white/30 text-sea-700"
        />
        <label htmlFor="archive-by-day" className="cursor-pointer text-sm text-sea-900/90">
          <BilingualStack
            en="Archive by day under year and month"
            zh="按日归档（在年、月下增加「日」文件夹）"
            primaryClassName="font-medium text-sea-900"
            secondaryClassName="text-xs font-normal text-sea-800/65 mt-1"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-sea-800/72">
            <BilingualStack
              en='When enabled: Photos/2025/03/15/file.jpg instead of Photos/2025/03/file.jpg.'
              zh="开启后路径示例：Photos/2025/03/15/文件名；关闭则为 Photos/2025/03/文件名。"
              primaryClassName="text-sea-800/78"
              secondaryClassName="text-[11px] text-sea-800/58 mt-1"
            />
          </p>
        </label>
      </div>

      <div className="space-y-4 border-t border-white/15 pt-4">
        <h3 className="text-xs font-medium text-sea-900">
          <BilingualInline
            en="File type recognition"
            zh="文件类型识别"
            primaryClassName="text-sea-900"
            secondaryClassName="text-[11px] font-normal text-sea-800/55"
          />
        </h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <label
              htmlFor="photo-exts"
              className="shrink-0 text-xs font-medium text-sea-900 sm:basis-36 sm:pt-0.5"
            >
              <BilingualInline
                en="Photo extensions:"
                zh="照片扩展名："
                primaryClassName="text-sea-900"
                secondaryClassName="text-[11px] font-normal text-sea-800/55"
              />
            </label>
            <input
              id="photo-exts"
              type="text"
              value={value.photoExtensionsInput}
              onChange={(e) => handlePhotoExtChange(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/30 px-3 py-2 text-sm text-sea-950 shadow-inner backdrop-blur-sm placeholder:text-sea-800/40 focus:border-sea-500/40 focus:outline-none focus:ring-1 focus:ring-sea-600/30"
              placeholder={mode === "zh" ? "jpg、png、heic…" : "jpg, png, heic…"}
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <label
              htmlFor="video-exts"
              className="shrink-0 text-xs font-medium text-sea-900 sm:basis-36 sm:pt-0.5"
            >
              <BilingualInline
                en="Video extensions:"
                zh="视频扩展名："
                primaryClassName="text-sea-900"
                secondaryClassName="text-[11px] font-normal text-sea-800/55"
              />
            </label>
            <input
              id="video-exts"
              type="text"
              value={value.videoExtensionsInput}
              onChange={(e) => handleVideoExtChange(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/30 px-3 py-2 text-sm text-sea-950 shadow-inner backdrop-blur-sm placeholder:text-sea-800/40 focus:border-sea-500/40 focus:outline-none focus:ring-1 focus:ring-sea-600/30"
              placeholder={mode === "zh" ? "mp4、mov、avi…" : "mp4, mov, avi…"}
            />
          </div>
        </div>
        <p className="text-[11px] text-sea-800/60">
          <BilingualStack
            en="(Spaces or commas; leave blank to restore defaults.)"
            zh="（支持空格或逗号分隔；留空恢复默认）"
            primaryClassName="text-sea-800/75"
            secondaryClassName="text-[11px] text-sea-800/55 mt-0.5"
          />
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-4">
        <p className="text-[11px] text-sea-800/65">
          {isDirty ? (
            <BilingualInline
              en="Unsaved changes"
              zh="有未保存更改"
              primaryClassName="text-sea-900"
              secondaryClassName="text-[11px] text-sea-800/55"
            />
          ) : (
            <BilingualInline
              en="Saved"
              zh="已保存"
              primaryClassName="text-sea-900"
              secondaryClassName="text-[11px] text-sea-800/55"
            />
          )}
        </p>
        <button
          type="button"
          onClick={onSave}
          className="shrink-0 rounded-full border border-white/30 bg-sea-800/90 px-4 py-1.5 text-xs font-medium text-white shadow-glass-sm backdrop-blur-sm hover:bg-sea-800"
        >
          <BilingualButtonLabel en="Save" zh="保存" />
        </button>
      </div>
    </div>
  );
}
