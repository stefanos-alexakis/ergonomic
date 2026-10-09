import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { CheckboxLabel } from "@/components/ui/checkbox";
import { LIMITE_TEXTO_ORIENTACAO } from "@/lib/orientacao";

/**
 * Orientação ao colaborador e pré-pesquisa — mesmos campos na criação e
 * na edição da pesquisa. Aparecem no topo da tela "Onde você trabalha",
 * que todo colaborador vê uma vez (a tela do código pode ser pulada pelo
 * QR code, que envia o código sozinho).
 */
export type ValoresOrientacao = { videoYoutube: string; textoOrientacao: string; exibirPrePesquisa: boolean };

/** Valores do formulário a partir do que está gravado na pesquisa. */
export function valoresDaPesquisa(p: { videoYoutubeId: string | null; textoOrientacao: string | null; exibirPrePesquisa: boolean }): ValoresOrientacao {
  return {
    videoYoutube: p.videoYoutubeId ? `https://youtu.be/${p.videoYoutubeId}` : "",
    textoOrientacao: p.textoOrientacao ?? "",
    exibirPrePesquisa: p.exibirPrePesquisa,
  };
}

export function CamposOrientacao({ valores }: { valores?: Partial<ValoresOrientacao> }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-medium text-zinc-900">Orientação ao colaborador (opcional)</legend>
      <Field
        label="Vídeo orientativo (link do YouTube)"
        htmlFor="videoYoutube"
        hint="Ex.: https://youtu.be/... ou https://www.youtube.com/watch?v=... — exibido sem cookies de rastreamento."
      >
        <Input
          id="videoYoutube"
          name="videoYoutube"
          defaultValue={valores?.videoYoutube ?? ""}
          placeholder="https://youtu.be/..."
        />
      </Field>
      <Field label="Texto de orientação" htmlFor="textoOrientacao" hint={`Até ${LIMITE_TEXTO_ORIENTACAO} caracteres. Quebras de linha são mantidas.`}>
        <Textarea
          id="textoOrientacao"
          name="textoOrientacao"
          rows={5}
          maxLength={LIMITE_TEXTO_ORIENTACAO}
          defaultValue={valores?.textoOrientacao ?? ""}
        />
      </Field>
      <CheckboxLabel name="exibirPrePesquisa" defaultChecked={valores?.exibirPrePesquisa ?? false}>
        Exibir a pré-pesquisa de perfil (o colaborador pode pular)
      </CheckboxLabel>
    </fieldset>
  );
}
