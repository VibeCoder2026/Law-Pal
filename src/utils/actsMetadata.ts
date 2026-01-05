import actsMetadata from '../assets/chunks/acts-metadata.json';

type ActMetadataEntry = {
  doc_id: string;
  title?: string;
  category?: string;
  pdf_filename?: string;
};

const documents = ((actsMetadata as { documents?: ActMetadataEntry[] })?.documents || []);
const metadataMap = new Map<string, ActMetadataEntry>(
  documents.map((doc) => [doc.doc_id, doc])
);

export const getActMetadataById = (docId: string): ActMetadataEntry | null => {
  return metadataMap.get(docId) || null;
};

export const getActPdfPath = (docId: string): string | null => {
  const metadata = getActMetadataById(docId);
  if (!metadata?.category || !metadata?.pdf_filename) {
    return null;
  }
  return `${metadata.category}/${metadata.pdf_filename}`;
};
