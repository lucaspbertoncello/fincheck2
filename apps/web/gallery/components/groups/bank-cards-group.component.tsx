import {
  AccountCard,
  AddAccountCard,
  BANK_THEMES,
  BankAvatar,
  BankCard,
  BankCardMini,
  Button,
  InvoiceCard,
  resolveBankThemeKey,
  type BankAvatarSize,
  type BankThemeKey,
} from '@fincheck/ui';

import { BALANCE_CURVE, INSTALLMENTS } from '../../constants/sample-bank.constant.ts';
import type { GallerySectionDef } from '../../types/gallery-group.type.ts';
import { GalleryVariant } from '../shell/gallery-variant.component.tsx';

const noop = () => undefined;
const THEME_KEYS = Object.keys(BANK_THEMES) as BankThemeKey[];
const AVATAR_SIZES: BankAvatarSize[] = [24, 36, 40, 48, 64];

export const BANK_CARDS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'bank-card',
    title: `BankCard: ${THEME_KEYS.length} temas`,
    content: (
      <>
        {THEME_KEYS.map((key) => (
          <GalleryVariant key={key} caption={`${key} · ${BANK_THEMES[key].name}`} width={300}>
            <BankCard
              theme={key}
              nickname="Roxinho"
              last4="4821"
              dueLabel="Vence dia 06"
              bankName={BANK_THEMES[key].name}
              stripeColor="#3FA110"
              tilt={false}
            />
          </GalleryVariant>
        ))}
        <GalleryVariant caption="tilt ligado (passe o mouse)" width={300}>
          <BankCard theme="nubank" nickname="Roxinho" last4="4821" dueLabel="Vence dia 06" />
        </GalleryVariant>
        <GalleryVariant caption="pequeno (200 px)" width={200}>
          <BankCard
            theme="inter"
            nickname="Laranja"
            last4="0932"
            dueLabel="Vence dia 12"
            tilt={false}
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'bank-card-mini',
    title: 'BankCardMini',
    content: (
      <div className="flex flex-wrap gap-s12">
        {THEME_KEYS.map((key) => (
          <GalleryVariant key={key} caption={key}>
            <BankCardMini theme={key} />
          </GalleryVariant>
        ))}
      </div>
    ),
  },
  {
    id: 'bank-avatar',
    title: 'BankAvatar',
    content: (
      <>
        {AVATAR_SIZES.map((size) => (
          <GalleryVariant key={size} caption={`${size} px`}>
            <div className="flex gap-s8">
              <BankAvatar theme="nubank" size={size} />
              <BankAvatar theme="wallet" size={size} />
              <BankAvatar theme="fallback" name="Rio Azul" size={size} />
            </div>
          </GalleryVariant>
        ))}
        <GalleryVariant caption="todos os temas, 36 px" width={560}>
          <div className="flex flex-wrap gap-s8">
            {THEME_KEYS.map((key) => (
              <BankAvatar key={key} theme={key} name="Rio Azul" />
            ))}
          </div>
        </GalleryVariant>
        <GalleryVariant caption="resolveBankThemeKey">
          <p className="text-meta text-fg-secondary">
            &quot;nubank&quot; = {resolveBankThemeKey('nubank')}
            <br />
            &quot;banco-xyz&quot; = {resolveBankThemeKey('banco-xyz')}
            <br />
            null = {resolveBankThemeKey(null)}
          </p>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'account-card',
    title: 'AccountCard e AddAccountCard',
    content: (
      <>
        <GalleryVariant caption="ok" width={380}>
          <AccountCard
            theme="nubank"
            name="Nubank"
            subtitle="Conta corrente"
            badge="Pluggy"
            balanceCents={242000}
            curve={BALANCE_CURVE}
            curveLabel="Saldo do mês"
            status="ok"
            statusLabel="Sincronizado há 12 min"
            actionLabel="Atualizar saldo"
            onAction={noop}
          />
        </GalleryVariant>
        <GalleryVariant caption="falhou" width={380}>
          <AccountCard
            theme="bradesco"
            name="Bradesco"
            subtitle="Conta corrente"
            badge="Pluggy"
            balanceCents={-12050}
            curve={BALANCE_CURVE}
            curveLabel="Saldo do mês"
            status="failed"
            statusLabel="Falhou ontem às 18:40; o consentimento expira em 31/10"
            failureNote="Sem transações novas do Bradesco até renovar."
            actionLabel="Renovar"
            onAction={noop}
          />
        </GalleryVariant>
        <GalleryVariant caption="carteira manual" width={380}>
          <AccountCard
            theme="wallet"
            name="Carteira"
            subtitle="Dinheiro"
            badge="Manual"
            balanceCents={32000}
            curve={BALANCE_CURVE.slice(0, 10)}
            curveLabel="Saldo do mês"
            status="ok"
            statusLabel="Saldo manual"
            actionLabel="Ajustar saldo"
            onAction={noop}
          />
        </GalleryVariant>
        <GalleryVariant caption="AddAccountCard" width={380}>
          <AddAccountCard
            title="Conectar outra conta"
            subtitle="Banco do Brasil, Inter, Itaú, Caixa e outros 6"
            onPress={noop}
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'invoice-card',
    title: 'InvoiceCard',
    content: (
      <>
        <GalleryVariant caption="aberta, ciclo, parcelas, ações" width={420}>
          <InvoiceCard
            status="open"
            totalCents={295000}
            dueLine="Fecha 30/10, vence 06/11"
            cycleProgress={0.7}
            installments={INSTALLMENTS}
            onOpenFuture={noop}
            actions={
              <Button size="sm" onPress={noop}>
                Registrar pagamento
              </Button>
            }
          />
        </GalleryVariant>
        <GalleryVariant caption="fechada" width={420}>
          <InvoiceCard
            status="closed"
            totalCents={184530}
            dueLine="Fechou 30/09, vence 06/10"
            cycleProgress={1}
            installments={INSTALLMENTS.slice(0, 1)}
          />
        </GalleryVariant>
        <GalleryVariant caption="paga (sem ciclo)" width={420}>
          <InvoiceCard
            status="paid"
            totalCents={150000}
            dueLine="Paga em 05/10"
            installments={[]}
          />
        </GalleryVariant>
        <GalleryVariant caption="crédito (negativa)" width={420}>
          <InvoiceCard
            status="open"
            totalCents={-4500}
            dueLine="Fecha 30/10, vence 06/11"
            cycleProgress={0.3}
            installments={[]}
          />
        </GalleryVariant>
      </>
    ),
  },
];
