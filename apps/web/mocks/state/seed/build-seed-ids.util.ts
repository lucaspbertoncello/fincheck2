import { newId } from '#mocks/state/mock-id.store.ts';

// Every id the seed steps share, made once and in a fixed order (so a reset gives the same ids).
export function buildSeedIds() {
  const base = {
    cat: {
      mercado: newId(),
      restaurantes: newId(),
      delivery: newId(),
      transporte: newId(),
      combustivel: newId(),
      moradia: newId(),
      saude: newId(),
      cuidadosPessoais: newId(),
      esportes: newId(),
      lazer: newId(),
      viagem: newId(),
      assinaturas: newId(),
      educacao: newId(),
      compras: newId(),
      tecnologia: newId(),
      pets: newId(),
      presentes: newId(),
      impostos: newId(),
      outros: newId(),
      salario: newId(),
      freelance: newId(),
      beneficio: newId(),
      rendimentos: newId(),
      vendas: newId(),
      outrasReceitas: newId(),
      viagensAntigas: newId(),
      mesada: newId(),
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

  // The five categories asked by Lucas on 09/11 take the last ids, so the ones above (that tests
  // and the capture targets name by number) stay where they were.
  return {
    ...base,
    cat: {
      ...base.cat,
      rotacaoContas: newId(),
      estadio: newId(),
      maconha: newId(),
      amigosFamilia: newId(),
      taxas: newId(),
    },
  };
}

export type SeedIds = ReturnType<typeof buildSeedIds>;
