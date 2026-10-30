import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ConfirmDialog, Modal, ModalActions, ModalHeader } from '#/components/overlays/index.ts';
import { ConfirmChangeList } from '#/components/overlays/confirm-change-list.component.tsx';

describe('Modal', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={false} onOpenChange={() => {}} title="Nova transação">
        <p>Campos</p>
      </Modal>,
    );

    expect(html).not.toContain('Nova transação');
  });
});

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        isOpen={false}
        onOpenChange={() => {}}
        title="Desconectar o Nubank?"
        description="As contas viram manuais."
        confirmLabel="Desconectar"
        onConfirm={() => {}}
      />,
    );

    expect(html).not.toContain('Desconectar');
  });
});

describe('ModalHeader', () => {
  it('renders title, subtitle and an accessible close button', () => {
    const html = renderToStaticMarkup(
      <ModalHeader title="Nova conta" subtitle="A pagar ou a receber" />,
    );

    expect(html).toContain('Nova conta');
    expect(html).toContain('A pagar ou a receber');
    expect(html).toContain('aria-label="Fechar"');
  });
});

describe('ConfirmChangeList', () => {
  it('lists each change in the subtle box', () => {
    const html = renderToStaticMarkup(
      <ConfirmChangeList
        changes={[{ text: '14 transações vão mudar' }, { text: 'Nada é apagado', icon: 'shield' }]}
      />,
    );

    expect(html).toContain('14 transações vão mudar');
    expect(html).toContain('Nada é apagado');
    expect(html).toContain('bg-subtle');
  });
});

describe('ModalActions', () => {
  it('pins the destructive action to the left when there is one', () => {
    const split = renderToStaticMarkup(
      <ModalActions destructive={<b>Excluir</b>}>Salvar</ModalActions>,
    );
    const plain = renderToStaticMarkup(<ModalActions>Salvar</ModalActions>);

    expect(split).toContain('lg:justify-between');
    expect(split).toContain('Excluir');
    expect(plain).toContain('lg:justify-end');
  });
});
