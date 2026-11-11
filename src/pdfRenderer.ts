export interface PdfPageImage { src: string; width: number; height: number }

export async function withPreviewTimeout<T>(work:Promise<T>,onTimeout:()=>void,timeoutMs=20000):Promise<T> {
  let timer:ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{onTimeout();reject(new Error('The page preview took too long. Open Preview PDF to view the finished document, or try again.'));},timeoutMs);})]);
  } finally {clearTimeout(timer!);}
}

// The embedded Site can restrict module workers. Bundle the PDF.js handler as a
// normal module so rendering does not depend on a worker handshake in an iframe.
// This still paints the exact PDF bytes used for saving and printing.
export async function renderPdfPages(bytes: Uint8Array, scale = 1.5): Promise<PdfPageImage[]> {
  let task:import('pdfjs-dist/legacy/build/pdf.mjs').PDFDocumentLoadingTask|undefined;
  let timedOut=false;
  const work=(async()=>{
    const [{getDocument},worker]=await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs'),
    ]);
    if(timedOut)throw new Error('Preview cancelled.');
    (globalThis as typeof globalThis & {pdfjsWorker?:unknown}).pdfjsWorker=worker;
    task=getDocument({data:bytes.slice(),isEvalSupported:false});
    const pdf=await task.promise;
    try {
      const images:PdfPageImage[]=[];
      for(let number=1;number<=pdf.numPages;number++){
        const page=await pdf.getPage(number);
        const viewport=page.getViewport({scale});
        const canvas=document.createElement('canvas');
        try {
          canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const context=canvas.getContext('2d');
          if(!context)throw new Error('This browser could not prepare the preview canvas.');
          await page.render({canvas,canvasContext:context,viewport}).promise;
          images.push({src:canvas.toDataURL('image/png'),width:viewport.width/scale,height:viewport.height/scale});
        } finally {canvas.width=canvas.height=0;page.cleanup();}
      }
      return images;
    } finally {await pdf.destroy();}
  })();
  return withPreviewTimeout(work,()=>{timedOut=true;void task?.destroy().catch(()=>{});});
}
