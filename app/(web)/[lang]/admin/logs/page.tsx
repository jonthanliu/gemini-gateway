import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLogs, LogFilters } from "@/lib/services/log.service";
import { LogViewer } from "../components/LogViewer";

export const revalidate = 0; // Disable caching

interface LogsPageProps {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LogsPage({
  params,
  searchParams,
}: LogsPageProps) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const { type, page, apiKey, errorType, errorCode, startDate, endDate } =
    await searchParams;
  const logType = type === "error" ? "error" : "request";
  const pageNumber = Number(page) || 1;

  // Assemble filters from searchParams
  const filters = {
    logType,
    page: pageNumber,
    limit: 15, // Hardcoded for now, can be made dynamic
    apiKey: typeof apiKey === "string" ? apiKey : undefined,
    errorType: typeof apiKey === "string" ? errorType : undefined,
    errorCode: typeof errorCode === "string" ? errorCode : undefined,
    startDate: typeof startDate === "string" ? startDate : undefined,
    endDate: typeof endDate === "string" ? endDate : undefined,
  };

  const logData = await getLogs(filters as LogFilters);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.admin.logs.title}</CardTitle>
        <CardDescription>{dictionary.admin.logs.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <LogViewer initialLogs={logData.logs} initialTotal={logData.total} />
      </CardContent>
    </Card>
  );
}
