import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { BankAvatar, Money, resolveBankThemeKey } from '@fincheck/ui';

type AccountPreviewProps = {
  isWallet: boolean;
  institutionCode: Institution.Code | '';
  bankName: string;
  typeLabel: string;
  name: string;
  balanceCents: number;
};

/** The account tile as it will look in the list: mark, name, kind and bank, and the opening balance. */
export function AccountPreview({
  isWallet,
  institutionCode,
  bankName,
  typeLabel,
  name,
  balanceCents,
}: AccountPreviewProps) {
  const theme = isWallet ? 'wallet' : resolveBankThemeKey(institutionCode);
  const subtitle = isWallet || !bankName ? typeLabel : `${typeLabel} · ${bankName}`;

  return (
    <div
      role="img"
      aria-label={`Prévia: ${name.trim() || 'Sua conta'}, ${subtitle}`}
      className="flex flex-col gap-s16 rounded-panel border border-line bg-subtle p-s16"
    >
      <div className="flex items-center gap-s12">
        <BankAvatar theme={theme} name={bankName || name} size={48} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate font-title text-body font-emphasis text-fg-primary">
            {name.trim() || 'Sua conta'}
          </p>
          <p className="truncate text-label text-fg-secondary">{subtitle}</p>
        </div>
      </div>
      <p className="text-money-md text-fg-primary">
        <Money cents={balanceCents} sign="none" />
      </p>
    </div>
  );
}
