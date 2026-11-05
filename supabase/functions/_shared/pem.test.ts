// `pnpm test:functions`: PEM parsing for secrets pasted from an openssl export.
import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { pemBlocks, pemBody, pemToDer } from './pem.ts';

const BODY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA';
const PEM = `-----BEGIN CERTIFICATE-----\n${BODY.slice(0, 20)}\n${BODY.slice(20)}\n-----END CERTIFICATE-----\n`;

Deno.test('pemBody: the base64 between BEGIN and END, without line breaks', () => {
  assertEquals(pemBody(PEM), BODY);
});

Deno.test('pemBody: ignores the "Bag Attributes" lines openssl pkcs12 puts before a block', () => {
  const exported = `Bag Attributes\n    friendlyName: Example\n    localKeyID: E0 DD 84 9C\nsubject=CN=Example\nissuer=CN=Example CA\n${PEM}`;
  assertEquals(pemBody(exported), BODY);
});

Deno.test('pemBody: reads a one-line secret with escaped newlines', () => {
  assertEquals(pemBody(PEM.replace(/\n/g, '\\n')), BODY);
});

Deno.test('pemToDer: decodes the body only', () => {
  assertEquals(pemToDer(`Bag Attributes\n${PEM}`), Uint8Array.from(atob(BODY), (c) => c.charCodeAt(0)));
});

Deno.test('pemBlocks: every block of a chain, in order', () => {
  const key = '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----';
  assertEquals(pemBlocks(`Bag Attributes\n${PEM}${key}\n`), [PEM.trim(), key]);
});
