import Omise from "omise";

let omiseClient: ReturnType<typeof Omise> | null = null;

export function getOmiseClient() {
  if (omiseClient) {
    return omiseClient;
  }

  const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
  const secretKey = process.env.OMISE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error(
      "Missing Omise keys. Please set NEXT_PUBLIC_OMISE_PUBLIC_KEY and OMISE_SECRET_KEY."
    );
  }

  omiseClient = Omise({
    publicKey,
    secretKey,
  });

  return omiseClient;
}
