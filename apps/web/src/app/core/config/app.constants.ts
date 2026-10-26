export const API_BASE_URL = '/api/v1';
export const STORAGE_KEYS = {
  language: 'erp.language',
  theme: 'erp.theme',
} as const;

/**
 * PrimeNG 21+ needs a PrimeUI license key, otherwise it shows an "Invalid PrimeUI License" notice.
 * Free Community License (individuals, students, small teams): https://primeui.dev/licenses/community
 * The key is verified offline and is meant to ship in the client bundle.
 */
export const PRIMEUI_LICENSE_KEY =
  'eyJpZCI6IjVmOWNhMjcyLTIyZDEtNGE4Zi1iOTBhLTIyOTZlNzQ2MTZlYyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3OTMwMDQ2MjcsImV4cCI6MTgyNDU0MDYyN30.cm4JP2jGgGdufb3FsL8S_xtOoJ1p09PLtNWX76zDh9M9H-f6SwDqHa4rppYlpn2iQpWTL71JZL2VlyIMOA-DDQ';
