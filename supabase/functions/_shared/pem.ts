/**
 * PEM text to DER bytes, for keys and certificates kept in Edge Function secrets (one line each, `\n` escaped: the
 * stack refuses multiline values).
 *
 * Only the body between the first BEGIN line and its END line is read: `openssl pkcs12` puts "Bag Attributes",
 * `subject=` and `issuer=` lines before each block when it exports from a .p12, and decoding those as base64 breaks
 * the key import or the signature with an unhelpful error.
 */
export function pemBody(pem: string): string {
  const text = pem.replace(/\\n/g, '\n');
  const body = text.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
  return (body ? body[1]! : text).replace(/\s+/g, '');
}

export function pemToDer(pem: string): Uint8Array {
  return Uint8Array.from(atob(pemBody(pem)), (c) => c.charCodeAt(0));
}

/** Every PEM block in a text, in order (a certificate chain in one secret). */
export function pemBlocks(text: string): string[] {
  return [...text.replace(/\\n/g, '\n').matchAll(/-----BEGIN ([^-]+)-----[\s\S]*?-----END \1-----/g)].map((m) => m[0]);
}
