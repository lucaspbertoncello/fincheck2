import { FineNote } from '@fincheck/ui';

/** The two fine notes of Configurações: where the keys live and the icon license. */
export function SettingsNotes() {
  return (
    <div className="flex flex-col gap-s12">
      <FineNote icon="lock">Tokens e chaves ficam criptografados neste PC.</FineNote>
      <p className="text-meta text-fg-secondary">
        Ícones Solar, de 480 Design, sob licença CC BY 4.0.
      </p>
    </div>
  );
}
