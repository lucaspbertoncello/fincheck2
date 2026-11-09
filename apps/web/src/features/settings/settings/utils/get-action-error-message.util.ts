import { isApiError } from '#/shared/api/api.error.ts';

const FOLDER_REASON: Record<string, string> = {
  not_found: 'Essa pasta não existe.',
  not_a_folder: 'Esse caminho não é uma pasta.',
  not_writable: 'O app não consegue gravar nessa pasta.',
};

const FILE_REASON: Record<string, string> = {
  corrupt: 'O arquivo está corrompido.',
  not_fincheck: 'Esse arquivo não é um banco do fincheck.',
  newer_version: 'Esse backup vem de uma versão mais nova do app.',
};

const CODE_MESSAGE: Record<string, string> = {
  NETWORK_ERROR: 'Não deu para falar com o app. Confira se ele está rodando e tente de novo.',
  BACKUP_FOLDER_NOT_SET: 'Escolha a pasta dos backups antes.',
  BACKUP_IN_PROGRESS:
    'Há um backup ou uma restauração em andamento. Espere terminar e tente de novo.',
  BACKUP_FILE_NOT_FOUND: 'Esse backup não está mais na pasta.',
  SYNC_CONNECTION_NOT_FOUND: 'Essa conexão não existe mais.',
  SYNC_ACCOUNT_MATCH_INVALID: 'Essa escolha de conta não vale mais. Atualize a tela.',
  SYNC_CONNECTION_DISCONNECTED: 'Essa conexão foi desconectada. Conecte o banco de novo.',
  SYNC_RUN_IN_PROGRESS: 'Já há uma busca em andamento nessa conexão.',
  SYNC_NOT_CONFIGURED: 'As chaves do Open Finance ainda não foram salvas.',
  SYNC_CREDENTIALS_INVALID: 'O Open Finance recusou essas chaves. Confira o Client ID e o Secret.',
  SYNC_PROVIDER_UNAVAILABLE:
    'Não deu para falar com o Open Finance agora. Tente de novo em instantes.',
  SYNC_ITEM_NOT_FOUND: 'O Open Finance não achou essa conexão. Confira o código no site.',
  TRANSACTION_LINKED_TO_BILL:
    'Essa transação paga uma conta: desfaça o pagamento ou a dívida antes de mudar a natureza ou o valor.',
};

/** The sentence under an action that failed; decided by the error `code`, never by its message. */
export function getActionErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback;

  const reason = error.details?.['reason'];
  if (typeof reason === 'string') {
    if (error.code === 'BACKUP_FOLDER_INVALID') {
      return FOLDER_REASON[reason] ?? 'Não deu para usar essa pasta.';
    }
    if (error.code === 'BACKUP_FILE_INVALID') {
      return FILE_REASON[reason] ?? 'Esse backup não pode ser restaurado.';
    }
  }

  return CODE_MESSAGE[error.code] ?? fallback;
}
