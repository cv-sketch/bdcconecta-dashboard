# BDC Conecta Dashboard — Documentación Técnico-Funcional

> **Repo:** `cv-sketch/bdcconecta-dashboard` (panel admin / back-office)
> **Repo hermano:** `cv-sketch/securepaynet-app` (app usuario final)
> **Backend compartido:** Supabase project `lkqyzyvfcnfzihhlhuru`
> **Producción admin:** https://bdcconecta-dashboard.vercel.app
> **Última actualización:** 27/04/2026

---

## 1. Propósito del aplicativo

BDC Conecta Dashboard es el **panel administrativo / back-office** del ecosistema **SecurePayNet**, la billetera virtual argentina diseñada para ser homologada por el **BCRA (Banco Central de la República Argentina)** a través del **Banco de Comercio (BDC)** y su API **BDC Conecta**.

Mientras que la app de usuario (`securepaynet-app`) opera la billetera del cliente final, este dashboard es la herramienta de los operadores internos del banco/PSP para:

- Alta y gestión de clientes con CUIT.
- Apertura/baja/bloqueo de cuentas (CVU + alias).
- Auditoría de movimientos y transferencias en tiempo real.
- Conciliación con BDC / red Coelsa.
- Consulta de comprobantes asociados a operaciones salientes.
- Monitoreo del estado del pipeline BDC Conecta (mock vs live).

El motivo del proyecto es **doble**:

1. **Homologación BCRA**: cumplir el contrato técnico que exige el regulador (vía BDC) antes de habilitar cuentas reales.
2. **Producción futura**: dejar la base lista para conmutar de modo *mock* a *live* con BDC sin reescribir la lógica de negocio.

---

## 2. Arquitectura general

```
┌────────────────────────┐         ┌────────────────────────┐
│  securepaynet-app      │         │  bdcconecta-dashboard  │
│  (usuario final)       │         │  (admin / back-office) │
│  React + Vite + TS     │         │  React + Vite + TS     │
│  Tailwind              │         │  Tailwind              │  ← ESTE REPO
│  Vercel                │         │  Vercel                │
└────────────┬───────────┘         └────────────┬───────────┘
             │                                  │
             │  Supabase JS SDK (anon/JWT)      │
             ▼                                  ▼
      ┌──────────────────────────────────────────────┐
      │      Supabase (lkqyzyvfcnfzihhlhuru)         │
      │                                              │
      │  • Postgres (RLS activado)                   │
      │  • Auth (email + password, rol admin)        │
      │  • Storage (comprobantes PDF, opcional)      │
      │  • Edge Functions (Deno):                    │
      │      - transferencia-execute (service_role)  │
      │      - bdc-proxy (gateway BDC)               │
      └─────────────────┬────────────────────────────┘
                        │
                        ▼ (modo live)
            ┌────────────────────────┐
            │   BDC Conecta API      │
            │   (Banco de Comercio)  │
            └────────────────────────┘
```

### Diferenciación admin vs usuario
- **Mismo Supabase, distinto frontend**: comparten DB, auth, edge functions.
- **Roles**: el admin se diferencia por su pertenencia a una tabla `admins` (o policy basada en `auth.users.raw_user_meta_data.role`).
- **Policies RLS**: tablas como `clientes` y `movimientos` tienen `admin_all` (lectura/escritura completa para admins) además de `select_own` (lectura propia para clientes).

---

## 3. Stack técnico

| Capa            | Tecnología                                     |
|-----------------|------------------------------------------------|
| Frontend        | React 18, Vite, TypeScript, TailwindCSS        |
| State / data    | Zustand, Supabase JS v2                        |
| Routing         | react-router-dom                               |
| Auth            | Supabase Auth (email + password)               |
| Backend         | Supabase Postgres + Edge Functions (Deno)      |
| Hosting         | Vercel (auto-deploy desde `main`)              |
| Integración     | BDC Conecta API (mock / live) vía `bdc-proxy`  |

---

## 4. Funcionalidades del dashboard

### 4.1 Clientes (`/clientes`)
- Listado paginado con filtros (nombre, CUIT, email, estado).
- Alta de cliente: crea registro en `clientes` y wallet asociada con saldo `0`.
- Edición de datos básicos (nombre, teléfono, documento).
- Vinculación con `auth.users` (un cliente puede o no tener login).
- Cambio de estado de wallet (`activa` / `inactiva` / `bloqueada`).

> ⚠️ **Regla**: en `/clientes` **NO** se muestran comprobantes ni movimientos detallados. Esa info vive en `/movimientos`.

### 4.2 Movimientos (`/movimientos`)
- Listado global de todos los movimientos del sistema.
- Filtros por wallet, tipo (`debito`/`credito`), fecha, estado.
- Cada fila correspondiente a una transferencia **saliente** muestra botón **"📄 Ver"** que abre el comprobante asociado.
- Movimientos entrantes (créditos por reverso o por TX entrante) **no** tienen comprobante propio.

### 4.3 Transferencias / Conciliación
- Listado de transferencias con su estado (`pendiente` / `completada` / `rechazada`).
- Trace ID Coelsa visible para cada operación confirmada.
- Conciliación manual contra BDC (cuando se active modo `live`).

### 4.4 Auditoría / Logs
- Vista de eventos sensibles (alta cuenta, bloqueo, cambio de saldo).
- (Roadmap: tabla `audit_log` poblada por triggers + Edge Functions).

### 4.5 Configuración
- Toggle del modo BDC (`mock` vs `live`) — actualmente vía env var en Edge Function.
- Gestión de límites por cliente (roadmap).

---

## 5. Reglas de negocio generales (invariantes)

Estas reglas son **compartidas** entre admin y usuario. Cualquier refactor debe respetarlas.

### 5.1 Cuentas y clientes
- Toda alta de cliente crea exactamente **una wallet** (1:1) al momento de homologación.
- **CUIT obligatorio**: NOT NULL, exactamente 11 dígitos numéricos.
- **Saldo inicial**: siempre `0`. El admin **no puede** crear una cuenta con saldo precargado.
- **Estado de wallet**: `activa` | `inactiva` | `bloqueada` (CHECK constraint en DB).
- **Creación de auth user**: la hace el cliente final (autoregistro o invitación). El admin **no debe** crear contraseñas en su nombre.

### 5.2 Transferencias
- Solo el **usuario titular** ejecuta transferencias salientes desde su wallet (vía Edge Function).
- El admin **no envía transferencias en nombre del cliente**: solo audita.
- **Monto > 0** (CHECK en DB).
- Operación **atómica**: transferencia + movimiento + comprobante en la misma operación de la Edge Function.

### 5.3 Movimientos
- Tipo: `debito` | `credito` (lowercase, CHECK constraint).
- Cada movimiento guarda `saldo_anterior` y `saldo_posterior` para trazabilidad BCRA.
- Vinculados a la `transferencia_id` que los originó.

### 5.4 Comprobantes
- Se generan **únicamente** para operaciones **salientes** del usuario.
- **Nunca** se generan para transferencias entrantes.
- Numeración automática vía trigger `trg_set_comprobante_numero` con formato `CMP-AAAA-NNNNNN`.
- Visibles en admin **solo** en `/movimientos` con botón "📄 Ver".
- **NO** existe entrada de menú "Comprobantes" en el sidebar del admin.
- **NO** aparecen en la sección `/clientes`.

### 5.5 Seguridad
- Supabase con **RLS activado** en todas las tablas sensibles.
- `transferencias` **no tiene policy de INSERT** para usuarios → la inserción ocurre por Edge Function con `service_role`.
- El `service_role_key` **nunca** se expone al frontend (ni al admin); vive como secret en Edge Functions.
- Tablas como `clientes`, `wallets`, `movimientos` tienen policy `admin_all` (lectura/escritura) además de policies de propietario.

---

## 6. Modelo de datos (resumen)

### `clientes`
| Campo           | Tipo         | Notas                           |
|-----------------|--------------|---------------------------------|
| id              | uuid PK      |                                 |
| auth_user_id    | uuid         | FK a `auth.users`               |
| nombre          | text         |                                 |
| apellido        | text         |                                 |
| email           | text         |                                 |
| cuit            | text         | NOT NULL, 11 dígitos            |
| telefono        | text         |                                 |
| documento       | text         |                                 |

### `wallets`
| Campo        | Tipo            | Notas                                 |
|--------------|-----------------|---------------------------------------|
| id           | uuid PK         |                                       |
| cliente_id   | uuid FK         | → `clientes.id`                       |
| cvu          | text UNIQUE     | 22 dígitos                            |
| alias        | text UNIQUE     |                                       |
| cuit         | text            |                                       |
| titular      | text            |                                       |
| saldo        | numeric         | Default 0                             |
| moneda       | text            | Default 'ARS'                         |
| estado       | text            | CHECK: activa/inactiva/bloqueada      |

### `transferencias`
| Campo               | Tipo      | Notas                                |
|---------------------|-----------|--------------------------------------|
| id                  | uuid PK   |                                      |
| wallet_origen_id    | uuid FK   |                                      |
| wallet_destino_id   | uuid FK   | Nullable (destino externo)           |
| monto               | numeric   | CHECK > 0                            |
| moneda              | text      |                                      |
| descripcion         | text      |                                      |
| referencia          | text      |                                      |
| estado              | text      | pendiente/completada/rechazada       |
| tipo                | text      |                                      |
| origin_id           | text      | ID externo BDC                       |
| from_cvu            | text      |                                      |
| from_cuit           | text      |                                      |
| to_address          | text      | CBU/CVU/Alias destino                |
| to_cuit             | text      |                                      |
| concepto            | text      |                                      |
| coelsa_id           | text      | Trace ID red Coelsa                  |

> **Importante:** `transferencias` **NO tiene** columna `cliente_id`. Se accede por `wallet_origen_id → wallets.cliente_id`.

### `movimientos`
| Campo            | Tipo    | Notas                              |
|------------------|---------|------------------------------------|
| id               | uuid PK |                                    |
| wallet_id        | uuid FK |                                    |
| cvu              | text    |                                    |
| tipo             | text    | CHECK: `debito` \| `credito` (lower)  |
| monto            | numeric | CHECK > 0                          |
| saldo_anterior   | numeric |                                    |
| saldo_posterior  | numeric |                                    |
| descripcion      | text    |                                    |
| estado           | text    |                                    |
| referencia       | text    |                                    |
| transferencia_id | uuid FK |                                    |

### `comprobantes`
| Campo               | Tipo    | Notas                            |
|---------------------|---------|----------------------------------|
| id                  | uuid PK |                                  |
| numero_seq          | int     | Autogen por trigger              |
| numero              | text    | `CMP-AAAA-NNNNNN` autogen        |
| transferencia_id    | uuid FK |                                  |
| wallet_origen_id    | uuid FK |                                  |
| wallet_destino_id   | uuid FK |                                  |
| cliente_id          | uuid FK |                                  |
| titular_origen      | text    |                                  |
| cuit_origen         | text    |                                  |
| cvu_origen          | text    |                                  |
| titular_destino     | text    |                                  |
| cuit_destino        | text    |                                  |
| cvu_destino         | text    |                                  |
| monto               | numeric |                                  |
| moneda              | text    |                                  |
| concepto            | text    |                                  |
| descripcion         | text    |                                  |
| coelsa_id           | text    |                                  |
| origin_id           | text    |                                  |
| saldo_anterior      | numeric |                                  |
| saldo_posterior     | numeric |                                  |
| banco               | text    | "Banco de Comercio"              |
| payload             | jsonb   | Snapshot completo de la op       |

### Triggers relevantes
- `trg_set_comprobante_numero`: completa `numero` a partir de `numero_seq`.

---

## 7. Edge Functions (compartidas con la app de usuario)

### 7.1 `transferencia-execute`
**Endpoint:** `POST https://lkqyzyvfcnfzihhlhuru.supabase.co/functions/v1/transferencia-execute`

**Headers:**
```
Authorization: Bearer <JWT del usuario>
Content-Type: application/json
```

**Body:**
```json
{
  "to_cbu": "0000003100099999999999",
  "to_cuit": "20111222333",
  "monto": 150,
  "concepto": "VAR",
  "descripcion": "Pago factura"
}
```

**Respuesta OK (200):**
```json
{
  "ok": true,
  "transferencia_id": "uuid",
  "movimiento_id": "uuid",
  "comprobante_id": "uuid",
  "numero_comprobante": "CMP-2026-000003",
  "coelsa_id": "MOCK-COELSA-...",
  "saldo_nuevo": 4750
}
```

**Lógica:**
1. Valida JWT con `admin.auth.getUser(token)` (service_role puede validar cualquier JWT del proyecto).
2. Busca wallet del cliente (vía `auth_user_id → clientes.id → wallets`).
3. Valida saldo suficiente.
4. Llama a `callBdcMock()` o `callBdcLive()` según env `BDC_MODE`.
5. INSERT en `transferencias` (estado `completada`).
6. INSERT en `movimientos` (`debito`, con saldo_anterior/posterior).
7. UPDATE saldo en `wallets`.
8. INSERT en `comprobantes` (trigger autogenera `numero`).
9. Devuelve IDs y nuevo saldo.

> **El admin no invoca esta función**: solo lee los registros que produce.

### 7.2 `bdc-proxy`
Gateway HTTP hacia BDC Conecta. Actúa como mock retornando trace IDs sintéticos. Diseñado para sustituirse por llamadas reales sin tocar el frontend.

**Operaciones consumidas por el dashboard admin (vía service `bdcService.ts` en `securepaynet-app`, replicable acá):**
- `sub-account.list` → consultar saldo de una cuenta.
- (Roadmap) `movimientos.list` → consultar movimientos en BDC.
- (Roadmap) `conciliacion` → batch nocturno.

---

## 8. Reglas generales de la API BDC Conecta

> Resumen funcional. El contrato técnico exacto se documenta cuando se active `live`.

### 8.1 Autenticación
- Por **API Key** + token de sesión emitido por BDC.
- Renovación periódica del token; el proxy debe gestionar refresh transparente.

### 8.2 Operaciones soportadas
| Operación              | Método  | Endpoint relativo            | Descripción                         |
|------------------------|---------|------------------------------|-------------------------------------|
| Alta cuenta CVU        | POST    | `/cuentas`                   | Crea CVU asociado a CUIT            |
| Consulta saldo         | GET     | `/cuentas/:cvu/saldo`        |                                     |
| Consulta movimientos   | GET     | `/cuentas/:cvu/movimientos`  |                                     |
| Transferencia saliente | POST    | `/transferencias`            | Iniciar TX a CBU/CVU/Alias          |
| Conciliación batch     | GET     | `/conciliacion?desde=...`    | Lista TX confirmadas red Coelsa     |

### 8.3 Reglas de uso
- **Idempotencia**: cada request lleva un `origin_id` único (UUID v4) generado por SecurePayNet. Reintentar con el mismo `origin_id` no duplica la operación.
- **Trace Coelsa**: toda TX exitosa devuelve un `coelsa_id` que se persiste en `transferencias.coelsa_id` y `comprobantes.coelsa_id`. Es el identificador oficial frente al BCRA.
- **Estados de TX**: `pendiente` → `completada` | `rechazada`. No hay mutaciones laterales.
- **Cutoff horario**: BDC define ventanas; las TX fuera de ventana quedan `pendiente` hasta apertura de la siguiente ventana.
- **Reversos**: solo BDC los origina. SecurePayNet los recibe vía conciliación y crea movimiento de `credito` con descripción "REVERSO TX <id>".
- **Límites**: configurables por cliente desde admin; el chequeo se hace en la Edge Function antes de invocar BDC.

### 8.4 Modos de ejecución
| Modo  | env var          | Descripción                                                       |
|-------|------------------|-------------------------------------------------------------------|
| mock  | `BDC_MODE=mock`  | Simula respuestas BDC con `coelsa_id` sintético `MOCK-COELSA-*`    |
| live  | `BDC_MODE=live`  | Llama a BDC real con API Key del banco                            |

Para activar live, alcanza con setear la env var en Supabase Edge Functions e implementar `callBdcLive()` en `transferencia-execute`. **No se requiere refactor del dashboard.**

---

## 9. Estructura de carpetas (frontend admin)

```
bdcconecta-dashboard/
├── public/
├── src/
│   ├── components/
│   │   ├── ComprobanteModal.tsx       ← reusado en /movimientos
│   │   └── (otros)
│   ├── layouts/
│   │   └── AdminLayout.tsx
│   ├── lib/
│   │   └── supabase.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Clientes.tsx
│   │   ├── ClienteDetalle.tsx
│   │   ├── Movimientos.tsx
│   │   └── Transferencias.tsx
│   ├── services/
│   │   └── bdcService.ts
│   ├── store/
│   │   └── useAuth.ts
│   ├── App.tsx
│   └── main.tsx
└── DOCUMENTACION.md
```

---

## 10. Reglas específicas del dashboard admin

1. **Sidebar**: solo entradas relevantes para back-office. **NO** existe entrada "Comprobantes" como sección — se acceden desde `/movimientos`.
2. **`/clientes`**: vista de gestión de personas y cuentas. **NO** muestra histórico de movimientos detallado ni comprobantes.
3. **`/movimientos`**: vista financiera. Es el único punto donde se accede a comprobantes (botón "📄 Ver" por fila aplicable).
4. **Crear contraseñas**: prohibido. Si un cliente necesita acceso, se invita por email.
5. **Edición de saldo manual**: prohibida desde UI. Cualquier ajuste debe pasar por una operación auditable (movimiento de tipo `ajuste` con justificación) — roadmap.
6. **Permisos**: el dashboard requiere autenticación con un usuario marcado como admin. Usuarios comunes deben ser redirigidos al login con error.

---

## 11. Flujo de auditoría de una transferencia

1. Usuario completa transferencia en `securepaynet-app` (no involucra al admin).
2. Edge Function escribe `transferencias`, `movimientos`, `comprobantes`.
3. Admin entra a `/movimientos` en este dashboard.
4. Filtra por wallet o por fecha.
5. Click en "📄 Ver" → abre `ComprobanteModal` con datos completos (titular, CUIT, CVU origen/destino, monto, coelsa_id, payload).
6. Si quiere conciliar, copia `coelsa_id` y compara contra el reporte de BDC.

---

## 12. Lecciones aprendidas (no repetir)

- **CHECK constraint `movimientos.tipo`** acepta solo `debito`/`credito` en **minúsculas**. `DEBITO` falla con violación de constraint.
- **`transferencias` no tiene `cliente_id`**: si una migración lo añadió en código pero no en DB, hay que ir por `wallet_origen_id`.
- **Editor web de GitHub autocompleta tags JSX** (`</div>` → `</div>div>`) al *tipear*. Hay que **pegar** con `ClipboardEvent` para evitarlo.
- **JWT firmado por nuevas claves Supabase** (`sb_publishable_*`) no se valida con el anon client legacy: usar `admin.auth.getUser(token)` con service_role.
- **Saldo inicial** debe ser `0` siempre.
- **No mostrar comprobantes en sidebar ni en `/clientes`** — esta regla se violó en iteraciones tempranas y hubo que revertir.

---

## 13. Convenciones de commits y deploy

- Branch principal: `main`.
- Commits con prefijo: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Vercel auto-deploy en push a `main` (~30 segundos).
- Edge Functions se despliegan desde el dashboard de Supabase ("Via Editor" o CLI).

---

## 14. Variables de entorno

### Frontend admin (Vercel)
```
VITE_SUPABASE_URL=https://lkqyzyvfcnfzihhlhuru.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

### Edge Functions (Supabase secrets, compartidas)
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   ← jamás exponer
SUPABASE_ANON_KEY=...
BDC_MODE=mock                    ← o "live"
BDC_API_BASE=https://...         ← solo en live
BDC_API_KEY=...                  ← solo en live, secret
```

---

## 15. Roadmap pendiente

1. Implementar `callBdcLive()` real con autenticación BDC + retries + idempotencia.
2. Vista de **conciliación** con diff entre registros locales y respuesta de `/conciliacion` de BDC.
3. Tabla `audit_log` + página `/auditoria` con filtros (usuario, acción, fecha).
4. Operación de **ajuste manual** auditable (con doble confirmación + justificación obligatoria).
5. Reportes exportables (CSV/PDF) para BCRA.
6. Métricas en tiempo real (Supabase Realtime) en `/dashboard`.
7. Tests E2E (Playwright) sobre los flujos de admin.

---

## 16. Contactos / responsables

- **Repos:** organización `cv-sketch` en GitHub.
- **Supabase project owner:** `cv-sketch's Org`.
- **Hosting:** cuenta Vercel asociada a `cv-sketch`.
- **Documento gemelo:** `securepaynet-app/DOCUMENTACION.md` (perspectiva usuario final).

---

_Fin del documento._
