import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { BankCard, resolveBankThemeKey } from '@fincheck/ui';

type CardPreviewProps = {
  institutionCode: Institution.Code | '';
  bankName: string;
  nickname: string;
  last4: string;
  dueDay: string;
};

/** The card as it will look in the list, in the theme of the bank, redrawn as the person types. */
export function CardPreview({
  institutionCode,
  bankName,
  nickname,
  last4,
  dueDay,
}: CardPreviewProps) {
  const due = dueDay.trim() === '' ? '--' : dueDay.padStart(2, '0');

  return (
    <div className="w-full max-w-56">
      <BankCard
        theme={resolveBankThemeKey(institutionCode)}
        bankName={bankName || undefined}
        nickname={nickname.trim() || 'Seu cartão'}
        last4={last4.padEnd(4, '•')}
        dueLabel={`Vence dia ${due}`}
      />
    </div>
  );
}
