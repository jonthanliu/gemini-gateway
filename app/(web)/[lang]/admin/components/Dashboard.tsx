// Architectural Decision:
// The Dashboard component is an ASYNC SERVER COMPONENT. This is a deliberate choice to co-locate
// data fetching with the component that uses the data. It fetches all necessary dashboard data
// (keys and system stats) in parallel upon rendering on the server.
//
// Implementation Details:
// - `async` function signature allows the use of `await` for data fetching.
// - `Promise.all` is used to fetch `keys` and `systemStats` concurrently for optimal performance.
// - It continues to compose client components (`KeyList`) and other server components (`DashboardStats`),
//   passing the fetched data down as props.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { getAllKeys, getSystemApiCallStats } from "@/lib/services/key.service";
import { AddKeyDialog } from "./AddKeyDialog";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { DashboardStats } from "./DashboardStats";
import { KeyList } from "./KeyList";

interface DashboardProps {
  dictionary: Dictionary["admin"];
}

export async function Dashboard({ dictionary }: DashboardProps) {
  // Fetch all necessary data in parallel for efficiency.
  const [keys, systemStats] = await Promise.all([
    getAllKeys(),
    getSystemApiCallStats(),
  ]);

  // Calculate key statistics based on the fetched keys array.
  const keyStats = {
    total: keys.length,
    active: keys.filter((k) => k.isWorking).length,
    inactive: keys.filter((k) => !k.isWorking).length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main title for the dashboard page */}
      <h1 className="text-2xl font-semibold">{dictionary.dashboard.title}</h1>

      {/* Display high-level statistics for both keys and system calls */}
      <DashboardStats keyStats={keyStats} systemStats={systemStats} />

      {/* Display detailed analytics charts and tables */}
      <AnalyticsDashboard />

      {/* Card container for the API key list and actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{dictionary.keys.title}</CardTitle>
            <CardDescription>{dictionary.keys.description}</CardDescription>
          </div>
          <AddKeyDialog />
        </CardHeader>
        <CardContent>
          <KeyList keys={keys} />
        </CardContent>
      </Card>
    </div>
  );
}
