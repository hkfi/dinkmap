import type { CrowdReport } from "@/lib/types";

type Store = {
  reports: CrowdReport[];
  submissions: Map<string, number[]>;
};

const globalForReports = globalThis as typeof globalThis & {
  __pickleballReports?: Store;
};

export const reportStore: Store =
  globalForReports.__pickleballReports ??
  (globalForReports.__pickleballReports = {
    reports: [
      {
        id: "seed-carl-schurz",
        courtId: "carl-schurz-park",
        level: "Busy",
        waitingCount: 8,
        openCourts: 0,
        distanceBucket: "0-150m",
        createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
      },
      {
        id: "seed-leif-ericson",
        courtId: "leif-ericson-park",
        level: "Moderate",
        waitingCount: 3,
        openCourts: 2,
        distanceBucket: "0-150m",
        createdAt: new Date(Date.now() - 38 * 60_000).toISOString(),
      },
    ],
    submissions: new Map(),
  });

export function getRecentReports(courtId?: string) {
  const cutoff = Date.now() - 2 * 60 * 60_000;
  return reportStore.reports.filter((report) => {
    return new Date(report.createdAt).getTime() >= cutoff && (!courtId || report.courtId === courtId);
  });
}

export function canSubmitReport(key: string) {
  const now = Date.now();
  const cutoff = now - 10 * 60_000;
  const recent = (reportStore.submissions.get(key) ?? []).filter((timestamp) => timestamp >= cutoff);
  reportStore.submissions.set(key, recent);
  return recent.length < 3;
}

export function recordSubmission(key: string) {
  const recent = reportStore.submissions.get(key) ?? [];
  reportStore.submissions.set(key, [...recent, Date.now()]);
}
