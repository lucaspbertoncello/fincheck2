import {
  Banner,
  Button,
  ConfirmDialog,
  InlineNotice,
  Modal,
  ModalActions,
  ModalFrame,
  ModalHeader,
  TextField,
  useToast,
  type BannerVariant,
  type ModalSize,
} from '@fincheck/ui';
import { useState } from 'react';

import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';

const noop = () => undefined;
const BANNERS: BannerVariant[] = ['warning', 'error', 'suggestion'];
const MODAL_SIZES: ModalSize[] = ['default', 'wide', 'dialog'];

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <GalleryVariant caption="mensagem simples">
        <Button
          variant="secondary"
          onPress={() =>
            toast.showUndoToast({
              message: 'Transação ignorada. Ela sai das contas do mês.',
              onUndo: noop,
            })
          }
        >
          Abrir toast
        </Button>
      </GalleryVariant>
      <GalleryVariant caption="com ícone de check e ação própria">
        <Button
          variant="secondary"
          onPress={() =>
            toast.showUndoToast({
              message: 'Categoria alterada.',
              actionLabel: 'Voltar',
              withIcon: true,
              onUndo: noop,
            })
          }
        >
          Abrir toast com ícone
        </Button>
      </GalleryVariant>
      <GalleryVariant caption="vários empilhados (máx. 3)">
        <Button
          variant="secondary"
          onPress={() => {
            for (const n of [1, 2, 3, 4]) {
              toast.showUndoToast({ message: `Ação número ${n} desfeita.`, onUndo: noop });
            }
          }}
        >
          Abrir 4 toasts
        </Button>
      </GalleryVariant>
    </>
  );
}

function ModalDemos() {
  const [open, setOpen] = useState<ModalSize | 'frame' | null>(null);
  const [name, setName] = useState('');
  const close = (isOpen: boolean) => {
    if (!isOpen) setOpen(null);
  };
  return (
    <>
      {MODAL_SIZES.map((size) => (
        <GalleryVariant key={size} caption={`Modal ${size}`}>
          <Button variant="secondary" onPress={() => setOpen(size)}>
            Abrir {size}
          </Button>
          <Modal
            isOpen={open === size}
            onOpenChange={close}
            size={size}
            title="Nova categoria"
            subtitle="Dê um nome e escolha o tipo."
            actions={
              <ModalActions>
                <Button variant="secondary" onPress={() => setOpen(null)}>
                  Cancelar
                </Button>
                <Button onPress={() => setOpen(null)}>Salvar</Button>
              </ModalActions>
            }
            destructiveAction={
              <Button variant="tertiary" danger onPress={() => setOpen(null)}>
                Excluir
              </Button>
            }
          >
            <TextField label="Nome" value={name} onChange={setName} placeholder="Ex.: Mercado" />
          </Modal>
        </GalleryVariant>
      ))}
      <GalleryVariant caption="ModalFrame + ModalHeader + ModalActions soltos">
        <Button variant="secondary" onPress={() => setOpen('frame')}>
          Abrir frame
        </Button>
        <ModalFrame isOpen={open === 'frame'} onOpenChange={close} label="Exemplo de frame">
          <div className="flex flex-col gap-s16 p-s24">
            <ModalHeader title="Frame solto" subtitle="Header, conteúdo e ações montados à mão." />
            <p className="text-body text-fg-secondary">Conteúdo livre.</p>
            <ModalActions>
              <Button onPress={() => setOpen(null)}>Fechar</Button>
            </ModalActions>
          </div>
        </ModalFrame>
      </GalleryVariant>
    </>
  );
}

type ConfirmKind = 'plain' | 'long' | 'changes' | 'destructive' | 'loading';

function ConfirmDemos() {
  const [open, setOpen] = useState<ConfirmKind | null>(null);
  const close = (isOpen: boolean) => {
    if (!isOpen) setOpen(null);
  };
  return (
    <>
      <GalleryVariant caption="simples">
        <Button variant="secondary" onPress={() => setOpen('plain')}>
          Confirmar simples
        </Button>
        <ConfirmDialog
          isOpen={open === 'plain'}
          onOpenChange={close}
          title="Aplicar a regra?"
          description="14 transações vão mudar de categoria."
          confirmLabel="Aplicar"
          onConfirm={() => setOpen(null)}
        />
      </GalleryVariant>
      <GalleryVariant caption="texto longo (a caixa cresce com o texto, os botões ficam logo abaixo)">
        <Button variant="secondary" onPress={() => setOpen('long')}>
          Confirmar com texto longo
        </Button>
        <ConfirmDialog
          isOpen={open === 'long'}
          onOpenChange={close}
          title="Aplicar a regra a todas as transações parecidas?"
          description="A regra recategoriza 14 transações do histórico e passa a valer para as próximas que chegarem do banco. As que você editou à mão continuam como estão, e dá para desfazer a regra depois em Categorias › Regras."
          confirmLabel="Aplicar a regra"
          onConfirm={() => setOpen(null)}
        />
      </GalleryVariant>
      <GalleryVariant caption="com lista do que muda e antes/depois">
        <Button variant="secondary" onPress={() => setOpen('changes')}>
          Confirmar com mudanças
        </Button>
        <ConfirmDialog
          isOpen={open === 'changes'}
          onOpenChange={close}
          title="Aplicar a regra ao histórico?"
          description="14 transações vão mudar de categoria."
          changes={[
            { text: 'Recategoriza o histórico' },
            { icon: 'lock', text: 'Edições feitas à mão não mudam' },
          ]}
          preview={{ before: 'Restaurantes', after: 'Delivery' }}
          confirmLabel="Aplicar"
          onConfirm={() => setOpen(null)}
        />
      </GalleryVariant>
      <GalleryVariant caption="destrutiva">
        <Button variant="secondary" danger onPress={() => setOpen('destructive')}>
          Confirmar destrutiva
        </Button>
        <ConfirmDialog
          isOpen={open === 'destructive'}
          onOpenChange={close}
          destructive
          title="Desconectar o Banco Aurora?"
          description="As transações já importadas continuam."
          confirmLabel="Desconectar"
          onConfirm={() => setOpen(null)}
        />
      </GalleryVariant>
      <GalleryVariant caption="carregando">
        <Button variant="secondary" onPress={() => setOpen('loading')}>
          Confirmar carregando
        </Button>
        <ConfirmDialog
          isOpen={open === 'loading'}
          onOpenChange={close}
          destructive
          loading
          title="Restaurar backup?"
          description="Os dados atuais serão substituídos."
          confirmLabel="Restaurar"
          onConfirm={noop}
        />
      </GalleryVariant>
    </>
  );
}

export const FEEDBACK_SECTIONS: GallerySectionDef[] = [
  {
    id: 'banner',
    title: 'Banner',
    content: (
      <>
        {BANNERS.map((variant) => (
          <GalleryVariant key={variant} caption={variant} width={560}>
            <Banner
              variant={variant}
              title="Não deu para sincronizar o Rio Azul"
              description="Falhou às 18:40 e às 19:10."
              actionLabel="Tentar agora"
              onAction={noop}
            />
          </GalleryVariant>
        ))}
        <GalleryVariant caption="sem descrição nem ação" width={560}>
          <Banner variant="warning" title="Dados de ontem em uma conta." />
        </GalleryVariant>
        <GalleryVariant caption="ação carregando" width={560}>
          <Banner
            variant="error"
            title="Não deu para sincronizar o Rio Azul"
            actionLabel="Tentar agora"
            onAction={noop}
            actionLoading
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'inline-notice',
    title: 'InlineNotice',
    content: (
      <>
        <GalleryVariant caption="com link (botão)">
          <InlineNotice linkLabel="ver" onPress={noop}>
            Aluguel atrasado 2 dias
          </InlineNotice>
        </GalleryVariant>
        <GalleryVariant caption="com link (href)">
          <InlineNotice linkLabel="ver" href="#inline">
            Aluguel atrasado 2 dias
          </InlineNotice>
        </GalleryVariant>
        <GalleryVariant caption="sem link">
          <InlineNotice>Dados do Rio Azul de ontem</InlineNotice>
        </GalleryVariant>
      </>
    ),
  },
  { id: 'toast', title: 'ToastProvider, UndoToast e useToast', content: <ToastButtons /> },
  { id: 'modal', title: 'Modal, ModalFrame, ModalHeader, ModalActions', content: <ModalDemos /> },
  { id: 'confirm-dialog', title: 'ConfirmDialog', content: <ConfirmDemos /> },
];
