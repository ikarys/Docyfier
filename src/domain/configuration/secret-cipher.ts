/**
 * Encryption of the credentials this app stores — the port, not an algorithm.
 *
 * The settings file sits in the data volume next to the documents, so anything
 * copied out of that volume would otherwise carry usable provider keys in clear
 * text. Who encrypts, and with which key, is an infrastructure decision; the
 * domain only states that stored credentials are ciphertext and that reading
 * one back can fail loudly.
 */
export interface SecretCipher {
  /** Ciphertext for storage. An empty secret stays empty: nothing to hide. */
  encrypt(plain: string): Promise<string>;
  /**
   * The secret behind a stored value. A value written before encryption existed
   * comes back unchanged; a value that cannot be read throws rather than
   * resolving to an empty key, which would silently send unauthenticated calls.
   */
  decrypt(stored: string): Promise<string>;
  /** Whether a stored value is ciphertext this cipher produced. */
  isEncrypted(stored: string): boolean;
}
