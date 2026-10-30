import { newId } from '#mocks/state/mock-id.store.ts';

// Every id the seed steps share, made once and in a fixed order (so a reset gives the same ids).
export function buildSeedIds() {
  return {
    cat: {
      mercado: newId(),
      restaurantes: newId(),
      delivery: newId(),
      transporte: newId(),
      moradia: newId(),
      saude: newId(),
      lazer: newId(),
      assinaturas: newId(),
      educacao: newId(),
      compras: newId(),
      pets: newId(),
      viagensAntigas: newId(),
      outros: newId(),
      salario: newId(),
      freelance: newId(),
      mesada: newId(),
      beneficio: newId(),
      outrasReceitas: newId(),
    },
    tag: { viagem: newId(), trabalho: newId(), delivery: newId(), presente: newId() },
    acc: {
      nuConta: newId(),
      brConta: newId(),
      carteira: newId(),
      nuCartao: newId(),
      brCartao: newId(),
      poupancaAntiga: newId(),
    },
    conn: { nu: newId(), br: newId() },
    rule: { ifood: newId(), posto: newId(), farmacia: newId() },
    rec: {
      salarioDia5: newId(),
      salarioDia15: newId(),
      freela: newId(),
      mesada: newId(),
      vr: newId(),
      academia: newId(),
      internet: newId(),
      diarista: newId(),
      streaming: newId(),
      celular: newId(),
    },
  };
}

export type SeedIds = ReturnType<typeof buildSeedIds>;
