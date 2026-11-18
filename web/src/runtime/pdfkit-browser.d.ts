declare module 'pdfkit/js/pdfkit.standalone' {
  // PDFKit's standalone browser build contains its own stream/Buffer support.
  // Keep the limited API use in mailing-list-pdf.ts covered by output tests.
  const PDFDocument: any
  export default PDFDocument
}
