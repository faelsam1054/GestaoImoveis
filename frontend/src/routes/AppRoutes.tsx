import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute, PermissaoRoute } from "./RoleRoute";
import { GestaoLayout } from "@/layouts/GestaoLayout";
import { InquilinoLayout } from "@/layouts/InquilinoLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { TrocarSenhaPage } from "@/pages/auth/TrocarSenhaPage";
import { EsqueciSenhaPage } from "@/pages/auth/EsqueciSenhaPage";
import { RedefinirSenhaPage } from "@/pages/auth/RedefinirSenhaPage";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DashboardPage } from "@/pages/gestao/dashboard/DashboardPage";
import { RelatoriosPage } from "@/pages/gestao/relatorios/RelatoriosPage";
import { TiposImovelPage } from "@/pages/gestao/tipos-imovel/TiposImovelPage";
import { ImoveisPage } from "@/pages/gestao/imoveis/ImoveisPage";
import { ImovelDetalhePage } from "@/pages/gestao/imoveis/ImovelDetalhePage";
import { InquilinosPage } from "@/pages/gestao/inquilinos/InquilinosPage";
import { ContratosPage } from "@/pages/gestao/contratos/ContratosPage";
import { ContratoDetalhePage } from "@/pages/gestao/contratos/ContratoDetalhePage";
import { PagamentosPage } from "@/pages/gestao/pagamentos/PagamentosPage";
import { ManutencaoPage } from "@/pages/gestao/manutencao/ManutencaoPage";
import { AdministradoresPage } from "@/pages/gestao/administradores/AdministradoresPage";
import { PagamentosAdminPage } from "@/pages/gestao/administradores/PagamentosAdminPage";
import { ConfiguracoesPage } from "@/pages/gestao/configuracoes/ConfiguracoesPage";
import { PerfilPage } from "@/pages/gestao/perfil/PerfilPage";
import { MeuImovelPage } from "@/pages/inquilino/MeuImovelPage";
import { MeuContratoPage } from "@/pages/inquilino/MeuContratoPage";
import { MeusPagamentosPage } from "@/pages/inquilino/MeusPagamentosPage";
import { MeuPerfilPage } from "@/pages/inquilino/MeuPerfilPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/trocar-senha" element={<TrocarSenhaPage />} />
        <Route path="/" element={<HomeRedirect />} />

        {/* Area de gestao: Proprietario (acesso total) + Administrador (por permissao) */}
        <Route element={<GestaoLayout />}>
          <Route element={<RoleRoute roles={["proprietario"]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tipos-imovel" element={<TiposImovelPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/pagamentos-admin" element={<PagamentosAdminPage />} />
          </Route>

          <Route element={<PermissaoRoute permissao="podeVerImoveis" />}>
            <Route path="/imoveis" element={<ImoveisPage />} />
            <Route path="/imoveis/:id" element={<ImovelDetalhePage />} />
          </Route>
          <Route element={<PermissaoRoute permissao="podeVerInquilinos" />}>
            <Route path="/inquilinos" element={<InquilinosPage />} />
          </Route>
          <Route element={<PermissaoRoute permissao="podeVerContratos" />}>
            <Route path="/contratos" element={<ContratosPage />} />
            <Route path="/contratos/:id" element={<ContratoDetalhePage />} />
          </Route>
          <Route element={<PermissaoRoute permissao="podeVerPagamentos" />}>
            <Route path="/pagamentos" element={<PagamentosPage />} />
          </Route>
          <Route element={<PermissaoRoute permissao="podeVerManutencao" />}>
            <Route path="/manutencao" element={<ManutencaoPage />} />
          </Route>
          <Route element={<PermissaoRoute permissao="podeVerAdministradores" />}>
            <Route path="/administradores" element={<AdministradoresPage />} />
          </Route>

          <Route path="/perfil" element={<PerfilPage />} />
        </Route>

        {/* Area do Inquilino */}
        <Route element={<RoleRoute roles={["inquilino"]} />}>
          <Route element={<InquilinoLayout />}>
            <Route path="/meu-imovel" element={<MeuImovelPage />} />
            <Route path="/meu-contrato" element={<MeuContratoPage />} />
            <Route path="/meus-pagamentos" element={<MeusPagamentosPage />} />
            <Route path="/meu-perfil" element={<MeuPerfilPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
