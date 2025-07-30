import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { modelMappingService } from "@/lib/services/model-mapping.service";
import { AddMappingDialog } from "./components/AddMappingDialog";
import { MappingsTable } from "./components/MappingsTable";

export default async function MappingsPage({
  params,
}: {
  params: Promise<{
    lang: Locale;
  }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const dict = dictionary.admin.mappings;
  const mappings = await modelMappingService.list();
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{dict.title}</h1>
          <p className="text-muted-foreground">{dict.description}</p>
        </div>
        <AddMappingDialog />
      </div>
      <MappingsTable data={mappings} />
    </div>
  );
}
