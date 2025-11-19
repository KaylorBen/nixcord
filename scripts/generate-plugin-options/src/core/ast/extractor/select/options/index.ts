/**
 * Namespace for SELECT option extraction. The heavy logic still resides in `select.ts`, but
 * callers import it from here so we can move implementations later without touching consumers.
 */
export { extractSelectOptions } from '../../select.js';
