import { urlEmbedYoutube } from "@/lib/orientacao";

/**
 * Vídeo e texto de orientação cadastrados na pesquisa. Embed pelo modo de
 * privacidade do YouTube; o texto é renderizado como texto (sem HTML).
 */
export function Orientacao({ videoYoutubeId, texto }: { videoYoutubeId: string | null; texto: string | null }) {
  if (!videoYoutubeId && !texto) return null;
  return (
    <section aria-label="Orientação sobre a pesquisa" className="mb-8 flex flex-col gap-4 anim-fade-up">
      {videoYoutubeId && (
        <div className="relative w-full overflow-hidden rounded-lg border border-[var(--ws-line,#e4e4e7)] bg-black pt-[56.25%]">
          <iframe
            src={urlEmbedYoutube(videoYoutubeId)}
            title="Vídeo de orientação sobre a pesquisa"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            allowFullScreen
          />
        </div>
      )}
      {texto && <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{texto}</p>}
    </section>
  );
}
