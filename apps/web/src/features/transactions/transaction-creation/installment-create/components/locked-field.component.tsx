import { FieldSet } from '@fincheck/ui';

type LockedFieldProps = {
  label: string;
  value: string;
};

/** A value the form shows but does not change (the card of a plan, the day of the purchase): text, not a field. */
export function LockedField({ label, value }: LockedFieldProps) {
  return (
    <FieldSet label={label}>
      <p className="min-h-ctl-sm py-s8 text-body text-fg-primary">{value}</p>
    </FieldSet>
  );
}
