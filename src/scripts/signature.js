import { buildEddsa, buildPoseidon } from 'circomlibjs';
import { randomBytes } from 'crypto';
import {
  parseSignatureFromCeramic,
  stringifySignature,
} from '../utils/index.js';

const main = async () => {
  const eddsa = await buildEddsa();
  const poseidon = await buildPoseidon();
  const test = Buffer.from('test').toString('hex');
  const msg = poseidon([test]);
  const privKey = randomBytes(32);
  const pubKey = eddsa.prv2pub(privKey);
  let signature = eddsa.signPoseidon(privKey, msg);
  signature = stringifySignature(signature);
  console.log('Stringified Signature: ', signature);
  signature = parseSignatureFromCeramic(signature);
  console.log('Parsed signature: ', signature);
  console.log('VERFIY: ', eddsa.verifyPoseidon(msg, signature, pubKey));
};

main();
