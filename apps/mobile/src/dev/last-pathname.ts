// The current route, so an agent link can be handled without navigating away (see +native-intent.tsx).
let last = '/';
export const setLastPathname = (p: string) => {
  last = p;
};
export const getLastPathname = () => last;
