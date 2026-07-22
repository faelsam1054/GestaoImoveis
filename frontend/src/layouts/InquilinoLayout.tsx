import { AppShell } from "@/components/app-shell";
import { NAV_INQUILINO } from "@/lib/nav";

export function InquilinoLayout() {
  return <AppShell titulo="Área do Inquilino" itensNav={NAV_INQUILINO} />;
}
