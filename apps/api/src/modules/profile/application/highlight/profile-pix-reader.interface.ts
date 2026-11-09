// Port to the biggest Pix of the whole history in one direction (BR-PRF-005). The owner is
// `transactions`.
export interface ProfilePixReader {
  findLargestPix(direction: 'sent' | 'received'): Promise<ProfilePixReader.Pix | null>;
}

export namespace ProfilePixReader {
  export type Pix = {
    transactionId: string;
    // Positive.
    amountCents: number;
    counterparty: string | null;
    occurredOn: string;
  };
}
