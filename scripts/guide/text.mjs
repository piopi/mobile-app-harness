// Escaping for the guides site's generated pages (render.mjs, glossary.mjs).
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
/** Text that Markdown must show as written: every ASCII punctuation mark escaped (CommonMark allows it on any). */
export const escapeMarkdown = (s) => String(s).replace(/[!-/:-@[-`{-~]/g, (c) => `\\${c}`);
