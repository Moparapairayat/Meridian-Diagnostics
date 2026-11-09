'use client';

import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

/** Code 128 barcode rendered as SVG in the browser (SPEC 2). */
export function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      height: 40,
      width: 1.2,
    });
  }, [value]);

  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} className="h-[11mm] w-full" preserveAspectRatio="none" />;
}
