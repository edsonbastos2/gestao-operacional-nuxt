# Atomic Design — SGO

O projeto segue rigorosamente o padrão Atomic Design de Brad Frost.
Todos os componentes vivem em `components/` divididos em 4 camadas.

---

## Camadas

### ⚛️  Atoms — `components/atoms/`
Menor unidade possível. Sem dependência de outros componentes.
Não carregam lógica de negócio. Apenas presentacionais.

| Componente          | Descrição                                      |
|---------------------|------------------------------------------------|
| `SgoIcon`           | Ícone PrimeIcons com tamanho/cor padronizados  |
| `SgoBadge`          | Badge de status (ativo/inativo/reserva/etc.)   |
| `SgoCapBadge`       | Badge de capacidade crítica                    |
| `SgoSpinner`        | Spinner de carregamento                        |
| `SgoAvatar`         | Avatar com inicial do nome                     |
| `SgoTag`            | Tag colorida genérica                          |
| `SgoDivider`        | Divisor horizontal com label opcional          |
| `SgoEmptyState`     | Estado vazio (ícone + título + descrição)      |

---

### 🧪 Molecules — `components/molecules/`
Combinação de átomos formando unidade funcional simples.
Podem ter props e emits, mas sem chamadas de API.

| Componente          | Átomos usados         | Descrição                          |
|---------------------|-----------------------|------------------------------------|
| `SgoFormField`      | —                     | Label + slot + erro + hint         |
| `SgoSearchBar`      | `SgoIcon`             | Input de busca com debounce        |
| `SgoPageHeader`     | `SgoIcon`, `SgoBadge` | Título da página + breadcrumb      |
| `SgoStatCard`       | `SgoIcon`             | Card de métrica do dashboard       |
| `SgoAlertBanner`    | `SgoIcon`             | Banner de alerta/info              |
| `SgoFilterBar`      | `SgoIcon`             | Barra de filtros colapsável        |

---

### 🦠 Organisms — `components/organisms/`
Seções completas da interface. Podem usar stores e fazer fetch via composables.

| Componente          | Moléculas usadas       | Descrição                          |
|---------------------|------------------------|------------------------------------|
| `AppSidebar`        | —                      | Menu lateral com navegação RBAC    |
| `AppHeader`         | `SgoPageHeader`        | Cabeçalho com breadcrumb e usuário |
| `AppDataTable`      | `SgoSearchBar`, `SgoFilterBar` | Tabela completa com busca  |
| `AppConfirmDialog`  | `SgoFormField`         | Dialog de confirmação/justificativa|

---

### 🖼️  Templates — `layouts/`
Definem a estrutura da página sem conteúdo real.
No Nuxt, os `layouts/` são os Templates do Atomic Design.

| Layout       | Descrição                                        |
|--------------|--------------------------------------------------|
| `default`    | Layout com sidebar + header (área autenticada)   |
| `auth`       | Layout centralizado para login/recuperação       |

---

### 📄 Pages — `pages/`
Instâncias reais dos templates com dados concretos.
Orquestram stores e composables. Compõem organismos + moléculas.

---

## Regras de uso

1. **Átomo** não importa Molécula, Organismo nem Page
2. **Molécula** pode importar apenas Átomos
3. **Organismo** pode importar Átomos e Moléculas (nunca outro Organismo diretamente no template)
4. **Template/Layout** orquestra Organismos
5. **Page** orquestra tudo — usa stores, composables e faz a composição final

---

## Prefixo de nomenclatura

- `Sgo` → componentes de negócio reutilizáveis (atoms, molecules)
- `App` → organismos e templates (única instância no layout)
