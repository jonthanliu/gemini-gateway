
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ParsedSettings } from "@/lib/config/settings";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "../actions/config.action";
import { DynamicListInput } from "./DynamicListInput";

interface ConfigFormProps {
  settings: ParsedSettings;
  dictionary: Dictionary["admin"]["config"]["form"];
}

// Use a different type for form state to handle JSON as strings
type FormState = Omit<
  ParsedSettings,
  "SAFETY_SETTINGS" | "THINKING_BUDGET_MAP"
> & {
  SAFETY_SETTINGS: string;
  THINKING_BUDGET_MAP: string;
};

export function ConfigForm({ settings, dictionary }: ConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<FormState>({
    ...settings,
    AUTH_TOKEN: "", // Don't pre-fill for security
    SAFETY_SETTINGS: JSON.stringify(settings.SAFETY_SETTINGS, null, 2),
    THINKING_BUDGET_MAP: JSON.stringify(settings.THINKING_BUDGET_MAP, null, 2),
  });

  const handleInputChange = ({
    target: { id, value },
  }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleDynamicListChange = (id: keyof FormState, newValue: string[]) => {
    setFormData((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const dataToSave: ParsedSettings = {
          ...formData,
          MAX_FAILURES: Number(formData.MAX_FAILURES),
          SAFETY_SETTINGS: JSON.parse(formData.SAFETY_SETTINGS),
          THINKING_BUDGET_MAP: JSON.parse(formData.THINKING_BUDGET_MAP),
        };
        const result = await updateSettingsAction(dataToSave);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success);
        }
      } catch {
        toast.error(dictionary.error.jsonError);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">{dictionary.tabs.general}</TabsTrigger>
          <TabsTrigger value="keys">{dictionary.tabs.keys}</TabsTrigger>
          <TabsTrigger value="network">{dictionary.tabs.network}</TabsTrigger>
          <TabsTrigger value="security">{dictionary.tabs.security}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="AUTH_TOKEN">{dictionary.authToken.label}</Label>
            <Input
              id="AUTH_TOKEN"
              type="password"
              value={formData.AUTH_TOKEN}
              onChange={handleInputChange}
              placeholder={dictionary.authToken.placeholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ALLOWED_TOKENS">
              {dictionary.allowedTokens.label}
            </Label>
            <DynamicListInput
              value={formData.ALLOWED_TOKENS}
              onChange={(newValue) =>
                handleDynamicListChange("ALLOWED_TOKENS", newValue)
              }
              dictionary={dictionary.dynamicList}
            />
            <p className="text-sm text-muted-foreground">
              {dictionary.allowedTokens.description}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="MAX_FAILURES">{dictionary.maxFailures.label}</Label>
            <Input
              id="MAX_FAILURES"
              type="number"
              value={formData.MAX_FAILURES}
              onChange={handleInputChange}
              placeholder={dictionary.maxFailures.placeholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="HEALTH_CHECK_MODEL">
              {dictionary.healthCheckModel.label}
            </Label>
            <Input
              id="HEALTH_CHECK_MODEL"
              value={formData.HEALTH_CHECK_MODEL}
              onChange={handleInputChange}
              placeholder={dictionary.healthCheckModel.placeholder}
            />
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="PROXY_URL">{dictionary.proxyUrl.label}</Label>
            <Input
              id="PROXY_URL"
              value={formData.PROXY_URL}
              onChange={handleInputChange}
              placeholder={dictionary.proxyUrl.placeholder}
            />
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="TOOLS_CODE_EXECUTION_ENABLED"
              checked={formData.TOOLS_CODE_EXECUTION_ENABLED}
              onCheckedChange={(checked) =>
                setFormData((p) => ({
                  ...p,
                  TOOLS_CODE_EXECUTION_ENABLED: checked,
                }))
              }
            />
            <Label htmlFor="TOOLS_CODE_EXECUTION_ENABLED">
              {dictionary.codeExecution.label}
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="SAFETY_SETTINGS">
              {dictionary.safetySettings.label}
            </Label>
            <Textarea
              id="SAFETY_SETTINGS"
              value={formData.SAFETY_SETTINGS}
              onChange={handleInputChange}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            {formData.TOOLS_CODE_EXECUTION_ENABLED && (
              <div className="space-y-2">
                <Label htmlFor="THINKING_BUDGET_MAP">
                  {dictionary.budgetMap.label}
                </Label>
                <Textarea
                  id="THINKING_BUDGET_MAP"
                  value={formData.THINKING_BUDGET_MAP}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <Button onClick={handleSubmit} disabled={isPending} className="mt-6">
        {isPending ? dictionary.saving : dictionary.saveBtn}
      </Button>
    </div>
  );
}
