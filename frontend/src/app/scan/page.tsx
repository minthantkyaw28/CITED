import { Suspense } from "react";

import { ScanClient } from "./scan-client";

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center font-mono text-sm text-muted-foreground">
          Initializing scan…
        </div>
      }
    >
      <ScanClient />
    </Suspense>
  );
}
