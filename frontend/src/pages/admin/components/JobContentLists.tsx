import { useTranslation } from "react-i18next";
import { JOB_SHORT_DESC_MAX } from "@/types/api";
import type { JobRequirementItem } from "@/types/api";
import { FormSection } from "@/components/admin/AnimatedAccordion";
import JobRequirementsInput from "@/components/ui/JobRequirementsInput";
import JobTagsInput from "@/components/ui/JobTagsInput";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import Field from "@/components/ui/Field";
import { inputCls, textareaCls } from "@/styles/forms";

interface JobContentListsProps {
  form: {
    short_description?: string;
    description?: string;
    requirements?: JobRequirementItem[];
    tags?: string[];
  };
  errors: Record<string, string>;
  onShortDescriptionChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onRequirementsChange: (reqs: JobRequirementItem[]) => void;
  onTagsChange: (tags: string[]) => void;
}

/**
 * The "content" + "lists" FormSections of the job dialog — shared between
 * Create and Edit since the fields, layout, and behaviors are identical.
 * The "basics" section stays in each dialog because Create has a company
 * selector and Edit funnels status changes through a confirm dialog.
 */
export default function JobContentLists({
  form,
  errors,
  onShortDescriptionChange,
  onDescriptionChange,
  onRequirementsChange,
  onTagsChange,
}: JobContentListsProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormSection title={t("admin.jobs.formSections.content")}>
        <div className="space-y-3">
          <Field
            label={t("admin.jobs.fields.shortDescription")}
            full
            name="short_description"
            error={errors.short_description}
          >
            <input
              type="text"
              maxLength={JOB_SHORT_DESC_MAX}
              value={form.short_description ?? ""}
              onChange={(e) => onShortDescriptionChange(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-white/35">
              {t("admin.jobs.fields.shortDescriptionHint", {
                count: (form.short_description ?? "").length,
                max: JOB_SHORT_DESC_MAX,
              })}
            </p>
          </Field>
          <Field
            label={t("admin.jobs.fields.description")}
            full
            name="description"
            error={errors.description}
          >
            <AutoGrowTextarea
              value={form.description ?? ""}
              onChange={onDescriptionChange}
              minRows={6}
              className={`${textareaCls} min-h-40`}
            />
          </Field>
        </div>
      </FormSection>
      <FormSection title={t("admin.jobs.formSections.lists")}>
        <div className="space-y-3">
          <Field
            label={t("admin.jobs.fields.requirements")}
            full
            name="requirements"
          >
            <JobRequirementsInput
              value={form.requirements ?? []}
              onChange={onRequirementsChange}
              error={errors.requirements}
            />
          </Field>
          <Field label={t("admin.jobs.fields.tags")} full>
            <JobTagsInput
              value={form.tags ?? []}
              onChange={onTagsChange}
              error={errors.tags}
            />
          </Field>
        </div>
      </FormSection>
    </>
  );
}
