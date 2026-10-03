/**
 * Utility for isolated receipt printing via hidden iframe.
 * Ensures ONLY the receipt content is sent to the printer with zero margins,
 * starting at the absolute top of the thermal roll without application DOM interference.
 */

export interface PrintReceiptOptions {
  paperWidthMm?: number; // e.g. 58, 80, or custom width in mm
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

export async function printReceiptViaIframe(
  receiptElement: HTMLElement,
  options: PrintReceiptOptions = {}
): Promise<void> {
  const paperWidthMm = options.paperWidthMm || 58;

  return new Promise((resolve, reject) => {
    try {
      // 1. Remove any previous print iframe
      const oldIframe = document.getElementById('ordo-print-iframe');
      if (oldIframe) {
        oldIframe.remove();
      }

      // 2. Create isolated iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'ordo-print-iframe';
      iframe.setAttribute('title', 'Receipt Print Window');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = `${paperWidthMm}mm`;
      iframe.style.height = '600px';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Gagal mengakses dokumen iframe print');
      }

      // 3. Clone styles from parent document to ensure identical Tailwind and font rendering
      const headContent: string[] = [
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">',
      ];

      // Copy all style & link[rel="stylesheet"] tags
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((el) => {
        headContent.push(el.outerHTML);
      });

      // Add strict print-reset styles tailored specifically for thermal paper
      headContent.push(`
        <style>
          @page {
            size: ${paperWidthMm}mm auto;
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html {
            margin: 0 !important;
            padding: 0 !important;
            width: ${paperWidthMm}mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${paperWidthMm}mm !important;
            min-width: ${paperWidthMm}mm !important;
            max-width: ${paperWidthMm}mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
            font-size: ${paperWidthMm <= 58 ? '10px' : '11px'} !important;
            line-height: 1.25 !important;
            display: block !important;
            position: relative !important;
            overflow: visible !important;
          }
          #printWrapper {
            width: ${paperWidthMm}mm !important;
            max-width: ${paperWidthMm}mm !important;
            margin: 0 !important;
            padding: ${paperWidthMm <= 58 ? '2mm 1.5mm' : '3mm 2mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
          }
        </style>
      `);

      iframeDoc.open();
      iframeDoc.write(`
        <!doctype html>
        <html lang="id">
          <head>${headContent.join('\n')}</head>
          <body>
            <div id="printWrapper">
              ${receiptElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // 4. Wait for images and resources in iframe to complete loading
      const checkReadyAndPrint = () => {
        const images = Array.from(iframeDoc.images);
        const imagePromises = images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolveImg) => {
            img.onload = () => resolveImg();
            img.onerror = () => resolveImg();
          });
        });

        Promise.all(imagePromises).then(() => {
          setTimeout(() => {
            try {
              // Measure actual height of the receipt content in mm
              const wrapper = iframeDoc.getElementById('printWrapper');
              if (wrapper) {
                const heightPx = wrapper.scrollHeight;
                const heightMm = Math.ceil(heightPx * 0.264583) + 4; // convert px to mm with small bottom buffer
                
                // Inject exact height into @page rule to avoid trailing empty page on thermal printers
                const pageStyle = iframeDoc.createElement('style');
                pageStyle.textContent = `@page { size: ${paperWidthMm}mm ${heightMm}mm; margin: 0mm; }`;
                iframeDoc.head.appendChild(pageStyle);
              }

              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();

              options.onComplete?.();
              resolve();

              // Auto-remove iframe after print dialog is closed
              setTimeout(() => {
                iframe.remove();
              }, 2000);
            } catch (err: any) {
              iframe.remove();
              options.onError?.(err);
              reject(err);
            }
          }, 150);
        });
      };

      if (iframeDoc.readyState === 'complete') {
        checkReadyAndPrint();
      } else {
        iframe.onload = checkReadyAndPrint;
      }
    } catch (error: any) {
      options.onError?.(error);
      reject(error);
    }
  });
}
