
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLogs } from "@/lib/services/log.service";
import { LogViewer } from "../components/LogViewer";

export const revalidate = 0; // Disable caching

interface LogsPageProps {
  params: { lang: Locale };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LogsPage({
  params,
  searchParams,
}: LogsPageProps) {
  const { lang } = params;
  const dictionary = await getDictionary(lang);
  const logType = searchParams.type === "error" ? "error" : "request";
  const page = Number(searchParams.page) || 1;
  
  // Assemble filters from searchParams
  const filters = {
    logType,
    page,
    limit: 15, // Hardcoded for now, can be made dynamic
    apiKey: typeof searchParams.apiKey === "string" ? searchParams.apiKey : undefined,
    errorType: typeof searchParams.errorType === "string" ? searchParams.errorType : undefined,
    errorCode: typeof searchParams.errorCode === "string" ? searchParams.errorCode : undefined,
    startDate: typeof searchParams.startDate === "string" ? searchParams.startDate : undefined,
    endDate: typeof searchParams.endDate === "string" ? searchParams.endDate : undefined,
  };

  const logData = await getLogs(filters);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.admin.logs.title}</CardTitle>
        <CardDescription>{dictionary.admin.logs.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <LogViewer
          initialLogs={logData.logs}
          initialTotal={logData.total}
          dictionary={dictionary.admin.logs}
        />
      </CardContent>
    </Card>
  );
}
