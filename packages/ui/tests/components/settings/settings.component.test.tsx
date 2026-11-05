import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SettingRow, SettingsNav, Steps } from '#/components/settings/index.ts';

const ITEMS = [
  {
    key: 'connections',
    title: 'Conexões',
    subtitle: 'Pluggy, Nubank e Bradesco',
    icon: 'plug',
    href: '/settings/connections',
  },
  {
    key: 'backup',
    title: 'Backup',
    subtitle: 'Pasta, restaurar',
    icon: 'database',
    href: '/settings/backup',
  },
  {
    key: 'appearance',
    title: 'Aparência',
    subtitle: 'Tema',
    icon: 'sun',
    href: '/settings/appearance',
  },
] as const;

describe('SettingsNav', () => {
  it('lists the sections as links and marks the active one', () => {
    const html = renderToStaticMarkup(
      <SettingsNav items={[...ITEMS]} activeKey="backup" label="Seções de Configurações" />,
    );

    expect(html).toContain('aria-label="Seções de Configurações"');
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(html).toContain('href="/settings/backup"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('bg-brand-weak');
    expect(html).toContain('text-brand');
    expect(html).toContain('Pasta, restaurar');
    expect(html).toContain('min-h-14');
  });

  it('draws the active fill as its own sliding view-transition group, only on the active item', () => {
    const html = renderToStaticMarkup(
      <SettingsNav items={[...ITEMS]} activeKey="backup" label="Seções" />,
    );

    expect(html.match(/data-settings-ind/g)).toHaveLength(1);
    expect(html).toContain('[view-transition-name:settings-ind]');
    const none = renderToStaticMarkup(
      <SettingsNav items={[...ITEMS]} activeKey="" label="Seções" />,
    );
    expect(none).not.toContain('data-settings-ind');
  });

  it('does not repeat the page title (ui adjustment 13)', () => {
    const html = renderToStaticMarkup(
      <SettingsNav items={[...ITEMS]} activeKey="connections" label="Seções" />,
    );
    expect(html).not.toContain('<h');
  });
});

describe('SettingRow', () => {
  it('writes the label, the description and the control', () => {
    const html = renderToStaticMarkup(
      <SettingRow
        label="Sincronizar sozinho"
        description="Última vez há 12 min"
        control={<button>Agora</button>}
      />,
    );

    expect(html).toContain('Sincronizar sozinho');
    expect(html).toContain('Última vez há 12 min');
    expect(html).toContain('<button>Agora</button>');
    expect(html).toContain('border-t');
    expect(html).toContain('py-s16');
  });

  it('renders only the label when it has nothing else, and can stack on the phone', () => {
    const plain = renderToStaticMarkup(<SettingRow label="Tema" />);
    expect(plain).not.toContain('text-meta');

    const stacked = renderToStaticMarkup(<SettingRow label="Tema" control={<i />} stackOnPhone />);
    expect(stacked).toContain('max-lg:flex-col');
  });
});

describe('Steps', () => {
  const STEPS = [
    { key: 'a', title: 'Criar conta no Meu Pluggy', status: 'done' },
    {
      key: 'b',
      title: 'Autorizar os bancos',
      description: 'Escolha Nubank e Bradesco',
      status: 'current',
    },
    { key: 'c', title: 'Conferir as contas', status: 'todo' },
  ] as const;

  it('draws a 32 px circle per step with the right look for each status', () => {
    const html = renderToStaticMarkup(<Steps items={[...STEPS]} label="Passos" />);

    expect(html.match(/size-8/g)).toHaveLength(3);
    expect(html).toContain('bg-gain-weak');
    expect(html).toContain('bg-(image:--gradient-button)');
    expect(html).toContain('bg-subtle');
    expect(html).toContain('<svg');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
    expect(html).toContain('Escolha Nubank e Bradesco');
  });

  it('flags the current step and speaks each status', () => {
    const html = renderToStaticMarkup(<Steps items={[...STEPS]} label="Passos" />);

    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('Concluído: ');
    expect(html).toContain('Passo atual: ');
    expect(html).toContain('A fazer: ');
  });
});
