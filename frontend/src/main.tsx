import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/i18n";
import "@/index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE,
    tracesSampleRate: 0.0,
  });
}

document.documentElement.lang = "he";
document.documentElement.dir = "rtl";

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>שגיאה בלתי צפויה. אנא רענן את הדף.</p>}>
    <App />
  </Sentry.ErrorBoundary>,
);
