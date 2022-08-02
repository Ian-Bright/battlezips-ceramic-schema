import {
  decrypt,
  encrypt,
  getEncryptionPublicKey,
} from '@metamask/eth-sig-util';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const { PRIV_KEY } = process.env;

export const arraysEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const decryptData = (encryptedData) => {
  return decrypt({
    encryptedData,
    privateKey: PRIV_KEY,
  });
};

export const encryptData = (data) => {
  const publicKey = getEncryptionPublicKey(PRIV_KEY);
  return encrypt({
    publicKey: publicKey,
    data,
    version: 'x25519-xsalsa20-poly1305',
  });
};

export const generateSeed = () => {
  return new Uint8Array(randomBytes(32));
};
