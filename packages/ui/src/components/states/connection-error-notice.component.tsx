import { LinkButton } from '#/components/buttons/link-button.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type ConnectionErrorNoticeProps = {
  /** Reason, when known: "login com erro". */
  reason?: string;
  /** Meu Pluggy address, opened in a new tab. */
  href: string;
  className?: string;
};

/**
 * "Conexão com erro · Reconectar no Open Finance": the account card's line when a connection fails
 * (components.md 14.3 with the MeuPluggy note of screens.md). Replaces the old "Renovar".
 */
export function ConnectionErrorNotice({ reason, href, className }: ConnectionErrorNoticeProps) {
  return (
    <p
      className={cx('flex flex-wrap items-center gap-x-s8 text-meta text-fg-secondary', className)}
    >
      <Icon name="warning" size="sm" className="text-caution" />
      <span>Conexão com erro{reason ? `, ${reason}` : ''}</span>
      <span aria-hidden="true">·</span>
      <LinkButton href={href} target="_blank" variant="secondary">
        Reconectar no Open Finance
      </LinkButton>
    </p>
  );
}
