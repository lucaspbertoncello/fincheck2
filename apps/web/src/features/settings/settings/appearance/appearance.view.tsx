import { SegmentedControl, Section, type SegmentedOption } from '@fincheck/ui';

const THEME_OPTIONS: SegmentedOption[] = [
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Escuro' },
  { key: 'system', label: 'Sistema' },
];

type AppearanceViewProps = {
  value: string;
  onChange: (key: string) => void;
};

/** "Aparência": the theme, Claro | Escuro | Sistema (RNF-011). The control sits under its text. */
export function AppearanceView({ value, onChange }: AppearanceViewProps) {
  return (
    <Section title="Aparência" variant="glass">
      <div className="flex flex-col gap-s16">
        <div className="flex flex-col gap-s4">
          <p className="text-body font-emphasis text-fg-primary">Tema</p>
          <p className="text-meta text-fg-secondary">
            Segue o Windows quando em &quot;Sistema&quot;
          </p>
        </div>
        <div>
          <SegmentedControl
            label="Tema"
            options={THEME_OPTIONS}
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
    </Section>
  );
}
