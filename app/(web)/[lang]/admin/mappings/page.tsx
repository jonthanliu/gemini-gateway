import { modelMappingService } from "@/lib/services/model-mapping.service";
import { MappingsTable } from "./components/mappings-table";

export default async function MappingsPage() {
  const mappings = await modelMappingService.list();
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Model Mappings</h1>
      <p className="text-muted-foreground mb-6">
        Configure rules to route incoming model requests to different downstream
        targets.
      </p>
      <MappingsTable data={mappings} />
    </div>
  );
}
