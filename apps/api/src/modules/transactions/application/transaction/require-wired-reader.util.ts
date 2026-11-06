import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

// A reader of a context that is not built yet is `undefined`. A request that needs it is refused
// with a 400 that says which field waits for which owner, instead of being half done. When the owner
// exists and is wired this never fires.
export function requireWiredReader<Reader>(
  reader: Reader | undefined,
  field: string,
  owner: string,
): Reader {
  if (reader === undefined) {
    throw new RequestValidationError([
      {
        path: field,
        message: `Ainda não disponível: depende de ${owner}, que chega em uma etapa seguinte.`,
      },
    ]);
  }

  return reader;
}
