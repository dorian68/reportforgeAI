type EnvShape = Record<string, string | undefined>;

declare const process: {
  env: EnvShape;
};

export interface SiteRuntimeConfig {
  salesEmail: string;
  leadEndpoint: string;
}

function normalizeEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function buildSiteRuntimeConfig(env: EnvShape): SiteRuntimeConfig {
  return {
    salesEmail: normalizeEnv(env.REPORTFORGE_SALES_EMAIL),
    leadEndpoint: normalizeEnv(env.REPORTFORGE_SITE_LEAD_ENDPOINT),
  };
}

export const siteRuntimeConfig = buildSiteRuntimeConfig({
  REPORTFORGE_SALES_EMAIL: process.env.REPORTFORGE_SALES_EMAIL,
  REPORTFORGE_SITE_LEAD_ENDPOINT: process.env.REPORTFORGE_SITE_LEAD_ENDPOINT,
});
