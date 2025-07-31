// Architectural Decision:
// This server component serves as the entry point for the configuration page.
// Its primary responsibility is to fetch the application's current settings on the server
// and pass them down to the client-side ConfigForm component.
//
// Implementation Details:
// - It's a server component to ensure that sensitive configuration data is fetched
//   securely on the server before any UI is rendered.
// - It retrieves settings using the `getSettings` utility.
// - It fetches the i18n dictionary to support internationalization.
// - It composes the `ConfigForm` component, which encapsulates all the form logic,
//   keeping this page component lean and focused on data fetching and layout.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/i18n-config";
import { getSettings } from "@/lib/config/settings";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { ConfigForm } from "../components/ConfigForm";

export const revalidate = 0; // Disable caching to ensure fresh settings are always loaded

export default async function ConfigPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const settings = await getSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.admin.config.form.title}</CardTitle>
        <CardDescription>
          {dictionary.admin.config.form.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConfigForm settings={settings} />
      </CardContent>
    </Card>
  );
}
