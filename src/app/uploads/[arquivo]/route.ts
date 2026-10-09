import { NextResponse } from "next/server";
import { lerUpload } from "@/lib/upload";

/**
 * Serve os logotipos das empresas (gravados em `uploads/`, fora de
 * `public/` — ver `src/lib/upload.ts`). Público de propósito: o logo
 * aparece na jornada do colaborador, que não tem login. O nome do arquivo
 * é um UUID novo a cada envio, então o cache pode ser "para sempre".
 */
export async function GET(_req: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  const upload = await lerUpload(arquivo);
  if (!upload) return new NextResponse("Não encontrado.", { status: 404 });

  return new NextResponse(new Uint8Array(upload.buffer), {
    headers: {
      "Content-Type": upload.contentType,
      "Content-Length": String(upload.buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
