"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function FilterBar() {
  const dictionary = useDictionary();
  const dict = dictionary.admin.logs.filters;
  const router = useRouter();
  const searchParams = useSearchParams();
  const logType = searchParams.get("type") ?? "request";

  const [apiKey, setApiKey] = useState(searchParams.get("apiKey") ?? "");
  const [errorType, setErrorType] = useState(
    searchParams.get("errorType") ?? ""
  );
  const [errorCode, setErrorCode] = useState(
    searchParams.get("errorCode") ?? ""
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined
  );

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (apiKey) params.set("apiKey", apiKey);
    else params.delete("apiKey");

    if (errorType && logType === "error") params.set("errorType", errorType);
    else params.delete("errorType");

    if (errorCode) params.set("errorCode", errorCode);
    else params.delete("errorCode");

    if (startDate)
      params.set("startDate", startDate.toISOString().split("T")[0]);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate.toISOString().split("T")[0]);
    else params.delete("endDate");

    router.push(`?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    params.set("type", logType);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-muted/50">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">{dict.apiKey}</label>
        <Input
          placeholder={dict.apiKeyPlaceholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-40"
        />
      </div>
      {logType === "error" && (
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">{dict.errorType}</label>
          <Input
            placeholder={dict.errorTypePlaceholder}
            value={errorType}
            onChange={(e) => setErrorType(e.target.value)}
            className="w-40"
          />
        </div>
      )}
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">
          {logType === "request" ? dict.statusCode : dict.errorCode}
        </label>
        <Input
          placeholder={dict.errorCodePlaceholder}
          value={errorCode}
          onChange={(e) => setErrorCode(e.target.value)}
          className="w-28"
        />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">{dict.startDate}</label>
        <DatePicker date={startDate} setDate={setStartDate} />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">{dict.endDate}</label>
        <DatePicker date={endDate} setDate={setEndDate} />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleApplyFilters}>{dict.apply}</Button>
        <Button variant="ghost" onClick={handleClearFilters}>
          {dict.clear}
        </Button>
      </div>
    </div>
  );
}
