const CATEGORIES = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '!@#$%^&*()-_=+[]{};:,.?/|~',
] as const;
const LENGTH = 16;

export function generatePassword(
  random: Pick<Crypto, 'getRandomValues'> = globalThis.crypto,
): string {
  function index(bound: number) {
    // Discard the incomplete modulo bucket so every index is equally likely.
    const limit = 256 - (256 % bound);
    const byte = new Uint8Array(1);
    do {
      random.getRandomValues(byte);
    } while (byte[0] >= limit);
    return byte[0] % bound;
  }
  const alphabet = CATEGORIES.join('');
  const characters = CATEGORIES.map((category) => category[index(category.length)]);
  while (characters.length < LENGTH) characters.push(alphabet[index(alphabet.length)]);
  // Fisher–Yates with the same rejection-sampled cryptographic selection.
  for (let i = characters.length - 1; i > 0; i--) {
    const j = index(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters.join('');
}
