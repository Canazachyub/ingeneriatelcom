/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string
  readonly VITE_SHEETS_ID: string
  readonly VITE_DRIVE_FOLDER_ID: string
  readonly VITE_FB_PAGE_ID: string
  readonly VITE_FB_ACCESS_TOKEN: string
  readonly VITE_CONTACT_EMAIL: string
  readonly VITE_DASHBOARD_URL: string
  /** Google Analytics 4 (G-XXXXXXXXXX). Vacío = sin analítica. */
  readonly VITE_GA_ID?: string
  /** Modo local de Licitaciones ('1' = activo): lee los JSON del vault vía el
   *  plugin de Vite en vez de llamar a Apps Script. Ver docs/PLAN_LICITACIONES_ADMIN.md. */
  readonly VITE_LIC_LOCAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
