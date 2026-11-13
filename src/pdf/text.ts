/** A positioned text fragment of a PDF page: left edge, baseline and width in PDF units. */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
}

interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
}

/** The part of a pdf.js document that is read here, so any build of the library can be passed in. */
export interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<{ getTextContent(): Promise<{ items: ReadonlyArray<object> }> }>;
}

/** Text items of every page without blanks: { str, x, y, w }. */
export async function readTextItems(doc: PdfDocumentLike): Promise<TextItem[][]> {
  const pages: TextItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    pages.push(
      (content.items as RawTextItem[])
        .filter((i) => i.str.trim() !== '')
        .map((i) => ({ str: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width })),
    );
  }
  return pages;
}
