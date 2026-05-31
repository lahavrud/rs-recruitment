import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ApplicationLoadingProps {
  variant: "loading";
}

interface ApplicationErrorProps {
  variant: "error";
  message: string;
}

type ApplicationStatusProps = ApplicationLoadingProps | ApplicationErrorProps;

export default function ApplicationStatus(props: ApplicationStatusProps) {
  const { t } = useTranslation();

  if (props.variant === "loading") {
    return (
      <div className="flex justify-center py-24">
        <div className="text-white/30">
          {t("publicJobs.application.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="rounded-lg border border-danger/20 bg-danger/10 p-6 text-sm text-danger">
        {props.message}
      </div>
      <Link
        to="/jobs"
        className="mt-6 inline-block text-sm text-white/40 transition hover:text-copper"
      >
        {t("publicJobs.application.backToJob")}
      </Link>
    </div>
  );
}
