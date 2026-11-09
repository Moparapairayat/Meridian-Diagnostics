// Report verification codes (SPEC 6): 10 characters from A–Z and 2–9.
import { randomInt } from 'node:crypto';

export const VERIFY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
export const VERIFY_CODE_RE = /^[A-Z2-9]{10}$/;

export function generateVerifyCode(): string {
  let code = '';
  for (let i = 0; i < 10; i++) code += VERIFY_ALPHABET[randomInt(VERIFY_ALPHABET.length)];
  return code;
}
