import { Chip, LinkButton, SettingRow } from '@fincheck/ui';

import { MEU_PLUGGY_URL } from '#/features/settings/settings/connections/constants/meu-pluggy-url.constant.ts';

/**
 * "Atualização": how the data arrives (by itself, every hour) and the way back for a bank in error,
 * as two setting rows in one glass card, each with its control at the right.
 */
export function AutoRefreshCard() {
  return (
    <div className="glass flex flex-col px-s16 lg:px-s24">
      <SettingRow
        label="Busca automática"
        description="O app busca os dados de hora em hora, sozinho."
        control={
          <Chip tone="neutral" icon="clock">
            De hora em hora
          </Chip>
        }
      />
      <SettingRow
        label="Banco com erro"
        description="Para voltar a receber de um banco com erro, reconecte no Open Finance."
        stackOnPhone
        control={
          <LinkButton
            href={MEU_PLUGGY_URL}
            target="_blank"
            variant="secondary"
            size="sm"
            icon="link"
          >
            Abrir o Meu Pluggy
          </LinkButton>
        }
      />
    </div>
  );
}
