export const extractPageFromText = (text?: string | null): number | undefined => {
  if (!text) return undefined;

  const patterns = [
    /LAWS\s*OF\s*GUYANA\s*(\d{1,4})/i,
    /LAWSOFGUYANA\s*(\d{1,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const page = Number.parseInt(match[1], 10);
      if (Number.isFinite(page) && page > 0) {
        return page;
      }
    }
  }

  return undefined;
};
