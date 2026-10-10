declare module 'nspell' {
  export default function nspell(dictionary: { aff: string | Uint8Array; dic: string | Uint8Array }): {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): void;
  };
}
