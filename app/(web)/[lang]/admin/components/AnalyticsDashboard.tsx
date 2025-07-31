"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDailyStats, getStatsByModel } from "@/lib/services/stats.service";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Define types for our stats data
type DailyStats = Awaited<ReturnType<typeof getDailyStats>>;
type ModelStats = Awaited<ReturnType<typeof getStatsByModel>>;

export function AnalyticsDashboard() {
  const [dailyStats, setDailyStats] = useState<DailyStats>([]);
  const [modelStats, setModelStats] = useState<ModelStats>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [daily, byModel] = await Promise.all([
        getDailyStats({}),
        getStatsByModel({}),
      ]);
      setDailyStats(daily);
      setModelStats(byModel);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>API Call History</CardTitle>
          <CardDescription>Daily API call volume.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="totalRequests"
                fill="#8884d8"
                name="Total Requests"
              />
              <Bar
                dataKey="successfulRequests"
                fill="#82ca9d"
                name="Successful"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Stats by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Success %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelStats.map((stat) => (
                <TableRow key={stat.model}>
                  <TableCell>{stat.model}</TableCell>
                  <TableCell>{stat.totalRequests}</TableCell>
                  <TableCell>{stat.successRate.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
