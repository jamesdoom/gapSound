// These are syntactic mentions from source metadata, not verified CVE records.
export function extractCveMentions(text: string): string[] {
  return [
    ...new Set(
      text
        .match(/(?<![\p{L}\p{N}_-])CVE-\d{4}-\d{4,19}(?![\p{L}\p{N}_-])/giu)
        ?.map((value) => value.toUpperCase()) ?? [],
    ),
  ].slice(0, 20);
}
