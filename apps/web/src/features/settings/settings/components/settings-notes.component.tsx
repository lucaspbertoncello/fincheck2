import { FineNote } from '@fincheck/ui';

/** The fine notes of Configurações: where the keys live and the icon and logo licenses. */
export function SettingsNotes() {
  return (
    <div className="flex flex-col gap-s12">
      <FineNote icon="lock">Tokens e chaves ficam criptografados neste PC.</FineNote>
      <p className="text-meta text-fg-secondary">
        Ícones Solar, de 480 Design, sob licença CC BY 4.0.
      </p>
      <p className="text-meta text-fg-secondary">
        Logos de serviços do Simple Icons (CC0); as marcas pertencem aos donos.
      </p>
    </div>
  );
}
