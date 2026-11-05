// What `pnpm guide render` wrote for the custom pages (src/generated/site.json).
import site from '../generated/site.json';

/** A path inside the site, under the base it is built for. */
export const href = (rel = '') => `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${rel}`;

export default site;
