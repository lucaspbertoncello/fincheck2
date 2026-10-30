import { Button, ChoiceChip } from '@fincheck/ui';

import type { PendingMatchItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

type PendingMatchesProps = {
  bankName: string;
  matches: PendingMatchItem[];
  /** Chosen account id per Pluggy account; `null` is "é outra conta"; missing is not chosen yet. */
  choices: Record<string, string | null>;
  onChoose: (pluggyAccountId: string, accountId: string | null) => void;
  isSaving: boolean;
  onConfirm: () => void;
};

/**
 * After reconnecting: for each account of the bank that could be more than one account that
 * already exists, the person says which one it is, or "é outra conta" (R4).
 */
export function PendingMatches({
  bankName,
  matches,
  choices,
  onChoose,
  isSaving,
  onConfirm,
}: PendingMatchesProps) {
  const allChosen = matches.every((match) => match.pluggyAccountId in choices);

  return (
    <div className="flex flex-col gap-s16 rounded-input border border-line bg-subtle p-s16">
      <p className="text-label font-emphasis text-fg-primary">
        Qual conta já existente é a do {bankName}?
      </p>
      {matches.map((match) => (
        <fieldset key={match.pluggyAccountId} className="flex flex-col gap-s8">
          <legend className="mb-s8 text-label text-fg-secondary">{match.title}</legend>
          <div className="flex flex-wrap gap-s8">
            {match.choices.map((choice) => (
              <ChoiceChip
                key={choice.accountId}
                selected={choices[match.pluggyAccountId] === choice.accountId}
                onChange={() => onChoose(match.pluggyAccountId, choice.accountId)}
              >
                {choice.label}
              </ChoiceChip>
            ))}
            <ChoiceChip
              ghost
              selected={choices[match.pluggyAccountId] === null}
              onChange={() => onChoose(match.pluggyAccountId, null)}
            >
              É outra conta
            </ChoiceChip>
          </div>
        </fieldset>
      ))}
      <div>
        <Button size="sm" isDisabled={!allChosen} loading={isSaving} onPress={onConfirm}>
          Confirmar escolha
        </Button>
      </div>
    </div>
  );
}
