/* localStorage is not always there. Safari in private mode, a browser with
   storage disabled, and an opaque origin all make it throw or leave it
   undefined — api/client.ts already wrapped its own access in try/catch with a
   "private mode" comment, but four screens read it bare, two of them inside a
   useState initialiser where the throw takes the whole screen down with it.

   A preference that cannot be saved is a preference that does not persist, not
   a crash. */

export function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch { /* nothing to do: the setting simply will not survive a reload */ }
}
