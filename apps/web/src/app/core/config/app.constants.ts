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
export const PRIMEUI_LICENSE_KEY = '';
