import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';

type DateLineProps = {
  /** Icon of the time of day: sunrise, sun, sunset or moon. */
  icon: Extract<IconName, 'sunrise' | 'sun' | 'sunset' | 'moon'>;
  /** "Quinta-feira, 22 de outubro". */
  text: string;
};

/** "Quinta-feira, 22 de outubro" with the icon of the hour, the same under every title. */
export function DateLine({ icon, text }: DateLineProps) {
  return (
    <p className="flex items-center gap-s8 text-meta text-fg-secondary lg:text-label">
      <Icon name={icon} size="sm" className="text-caution" />
      {text}
    </p>
  );
}
