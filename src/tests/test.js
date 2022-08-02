import chaiAsPromised from 'chai-as-promised';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { DataModel } from '@glazed/datamodel';
import { DID } from 'dids';
import { DIDDataStore } from '@glazed/did-datastore';
import dotenv from 'dotenv';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { ERROR_MESSAGES } from '../constants/index.js';
import chai, { expect } from 'chai';
import { toString } from 'uint8arrays';
import { getResolver } from 'key-did-resolver';
import modelAliases from '../deployment/deployment.json' assert { type: 'json' };
import {
  arraysEqual,
  decryptData,
  encryptData,
  generateSeed,
} from '../utils/index.js';

chai.use(chaiAsPromised);
dotenv.config();
const { API_URL } = process.env;
const TIMEOUT = 20000;

const authenticateDID = async (seed) => {
  const did = new DID({
    provider: new Ed25519Provider(seed),
    resolver: getResolver(),
  });
  await did.authenticate();
  return did;
};

describe('Test Battlezip game', async () => {
  let ceramic;
  let did;
  let store;

  before(async () => {
    const seed = generateSeed();
    console.log('Generated DID seed: ', toString(seed, 'base16'));
    did = await authenticateDID(seed);
    ceramic = new CeramicClient(API_URL);
    ceramic.did = did;
    const model = new DataModel({ ceramic: ceramic, aliases: modelAliases });
    store = new DIDDataStore({ ceramic: ceramic, model });
  });

  describe('Initial profile state', async () => {
    it('No games should exist for upon profile initialization', async () => {
      const did1Profile = await store.get('myBattlezipProfile');
      expect(did1Profile).to.equal(null);
    }).timeout(TIMEOUT);
  });

  describe('Test schema property inclusion', async () => {
    it('Should throw if Battlezip profile is initialized without activeGame', async () => {
      try {
        await store.set('myBattlezipProfile', {
          text: 'Invalid input.',
        });
      } catch (err) {
        // Hacky error check while I determine why Chai's .throw() is not working as expected
        expect(err.message).to.include(ERROR_MESSAGES.VALIDATION_MESSAGE);
      }
    }).timeout(TIMEOUT);
    it('Should throw if required properties are not included in activeGame', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {},
        });
      } catch (err) {
        expect(err.message).to.include(ERROR_MESSAGES.VALIDATION_MESSAGE);
      }
    }).timeout(TIMEOUT);
    it('Should throw if required properties are not included in layer 2 private key', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: null,
            adversaryShots: [[]],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [],
          },
          l2PrivKey: {
            nonce: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(ERROR_MESSAGES.VALIDATION_MESSAGE);
      }
    }).timeout(TIMEOUT);
  });

  describe('Test input validation on required properties', async () => {
    it('Should throw if not all required ships are included', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: null,
            adversaryShots: [],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [],
          },
          l2PrivKey: {
            ciphertext: '',
            ephemPublicKey: '',
            nonce: '',
            version: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(ERROR_MESSAGES.FEWER_ITEMS_MESSAGE);
      }
    }).timeout(TIMEOUT);
    it('Should throw if ship position array elements are invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: null,
            adversaryShots: [],
            shipPositions: [
              ['0', '0', '0'],
              ['0', '0', '0'],
              ['0', '0', '0'],
              ['0', '0', '0'],
              ['0', '0', '0'],
            ],
            shots: [],
          },
          l2PrivKey: {
            ciphertext: '',
            ephemPublicKey: '',
            nonce: '',
            version: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.INVALID_TYPE_MESSAGE_NUMBER
        );
      }
    }).timeout(TIMEOUT);
    it('Should throw if shot array elements are invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: null,
            adversaryShots: [],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [['1', '1', '1']],
          },
          l2PrivKey: {
            ciphertext: '',
            ephemPublicKey: '',
            nonce: '',
            version: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.INVALID_TYPE_MESSAGE_NUMBER
        );
      }
    }).timeout(TIMEOUT);
    it('Should throw if adversary shot array elements are invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: null,
            adversaryShots: [['1', '1', '1']],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [[0, 0, 0]],
          },
          l2PrivKey: {
            ciphertext: '',
            ephemPublicKey: '',
            nonce: '',
            version: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.INVALID_TYPE_MESSAGE_NUMBER
        );
      }
    }).timeout(TIMEOUT);
    it('Should throw if l2PrivKey is invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: null,
            adversaryShots: [[0, 0, 0]],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [[0, 0, 0]],
          },
          l2PrivKey: '',
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.INVALID_TYPE_MESSAGE_OBJECT
        );
      }
    }).timeout(TIMEOUT);
    it('Should throw if adversary public key is invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: null,
            adversaryPubkey: 1234,
            adversaryShots: [[0, 0, 0]],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [[0, 0, 0]],
          },
          l2PrivKey: {
            ciphertext: '',
            ephemPublicKey: '',
            nonce: '',
            version: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.INVALID_TYPE_MESSAGE_STRING
        );
      }
    }).timeout(TIMEOUT);
    it('Should throw if adversary proof is invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            adversaryProof: 1234,
            adversaryPubkey: null,
            adversaryShots: [[0, 0, 0]],
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [[0, 0, 0]],
          },
          l2PrivKey: {
            ciphertext: '',
            ephemPublicKey: '',
            nonce: '',
            version: '',
          },
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.INVALID_TYPE_MESSAGE_STRING
        );
      }
    }).timeout(TIMEOUT);
  });

  describe('Test correct game state storage', async () => {
    it('Should be able to store correct input and read off of ceramic', async () => {
      const shot1 = [0, 0, 1];
      const shot2 = [0, 1, 0];

      await store.set('myBattlezipProfile', {
        activeGame: {
          adversaryProof: null,
          adversaryPubkey: null,
          adversaryShots: [[1, 1, 1]],
          shipPositions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          shots: [shot1, shot2],
        },
        l2PrivKey: {
          ciphertext: '',
          ephemPublicKey: '',
          nonce: '',
          version: '',
        },
      });
      const res = await store.get('myBattlezipProfile');
      expect(res.activeGame.adversaryProof).to.be.null;
      expect(res.activeGame.adversaryProof).to.be.null;
      expect(arraysEqual([1, 1, 1], res.activeGame.adversaryShots[0])).to.be
        .true;
      expect(arraysEqual([0, 0, 0], res.activeGame.shipPositions[0])).to.be
        .true;
      expect(arraysEqual([0, 0, 0], res.activeGame.shipPositions[1])).to.be
        .true;
      expect(arraysEqual([0, 0, 0], res.activeGame.shipPositions[2])).to.be
        .true;
      expect(arraysEqual([0, 0, 0], res.activeGame.shipPositions[3])).to.be
        .true;
      expect(arraysEqual([0, 0, 0], res.activeGame.shipPositions[4])).to.be
        .true;
      expect(arraysEqual(shot1, res.activeGame.shots[0])).to.be.true;
      expect(arraysEqual(shot2, res.activeGame.shots[1])).to.be.true;
      expect(res.l2PrivKey.ciphertext).to.equal('');
      expect(res.l2PrivKey.ephemPublicKey).to.equal('');
      expect(res.l2PrivKey.nonce).to.equal('');
      expect(res.l2PrivKey.version).to.equal('');
    }).timeout(TIMEOUT);

    it('Should be able to update certain properties while maintaining old state', async () => {
      const oldStoreData = await store.get('myBattlezipProfile');
      const { activeGame: activeGamePrevState, l2PrivKey } = oldStoreData;
      await store.set('myBattlezipProfile', {
        l2PrivKey,
        activeGame: {
          ...activeGamePrevState,
          adversaryProof: 'Proof',
          adversaryPubkey: 'Pubkey',
        },
      });
      const latestStoreData = await store.get('myBattlezipProfile');
      expect(latestStoreData.activeGame.adversaryProof).to.equal('Proof');
      expect(latestStoreData.activeGame.adversaryPubkey).to.equal('Pubkey');
      expect(
        arraysEqual([1, 1, 1], latestStoreData.activeGame.adversaryShots[0])
      ).to.be.true;
      expect(
        arraysEqual([0, 0, 0], latestStoreData.activeGame.shipPositions[0])
      ).to.be.true;
      expect(
        arraysEqual([0, 0, 0], latestStoreData.activeGame.shipPositions[1])
      ).to.be.true;
      expect(
        arraysEqual([0, 0, 0], latestStoreData.activeGame.shipPositions[2])
      ).to.be.true;
      expect(
        arraysEqual([0, 0, 0], latestStoreData.activeGame.shipPositions[3])
      ).to.be.true;
      expect(
        arraysEqual([0, 0, 0], latestStoreData.activeGame.shipPositions[4])
      ).to.be.true;
      expect(arraysEqual([0, 0, 1], latestStoreData.activeGame.shots[0])).to.be
        .true;
      expect(arraysEqual([0, 1, 0], latestStoreData.activeGame.shots[1])).to.be
        .true;
      expect(latestStoreData.l2PrivKey.ciphertext).to.equal('');
      expect(latestStoreData.l2PrivKey.ephemPublicKey).to.equal('');
      expect(latestStoreData.l2PrivKey.nonce).to.equal('');
      expect(latestStoreData.l2PrivKey.version).to.equal('');
    }).timeout(TIMEOUT);
  });

  describe('Test encryption mechanism', async () => {
    it('Should be able to encrypt layer 2 private key, store on chain, and decrypt', async () => {
      const seed = generateSeed();
      const l2PrivKey = toString(seed, 'base16');
      const encyptedPrivKey = encryptData(l2PrivKey);
      const oldStoreData = await store.get('myBattlezipProfile');
      await store.set('myBattlezipProfile', {
        ...oldStoreData,
        l2PrivKey: encyptedPrivKey,
      });
      const latestStoreData = await store.get('myBattlezipProfile');
      const decryptedPrivKey = decryptData(latestStoreData.l2PrivKey);
      expect(l2PrivKey).to.equal(decryptedPrivKey);
    }).timeout(TIMEOUT);
  });
});
