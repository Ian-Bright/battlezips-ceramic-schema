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
import { randomBytes } from 'crypto';
import { arraysEqual } from '../utils/index.js';

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

const generateSeed = () => {
  return new Uint8Array(randomBytes(32));
};

describe('Test Battlezip game', async () => {
  let ceramic;
  let did;
  let store;

  before(async () => {
    const seed = generateSeed();
    console.log('Generated seed: ', toString(seed, 'base16'));
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
        expect(err.message).to.include(
          ERROR_MESSAGES.TOP_LEVEL_VALIDATION_ERROR_MESSAGE
        );
      }
    }).timeout(TIMEOUT);
    it('Should throw if required properties are not included', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {},
        });
      } catch (err) {
        expect(err.message).to.include(
          ERROR_MESSAGES.ACTIVE_GAME_PROPERTY_VALIDATION_MESSAGE
        );
      }
    }).timeout(TIMEOUT);
  });

  describe('Test input validation on required properties', async () => {
    it('Should throw if not all required ships are included', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [],
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
            shipPositions: [
              ['0', '0', '0'],
              ['0', '0', '0'],
              ['0', '0', '0'],
              ['0', '0', '0'],
              ['0', '0', '0'],
            ],
            shots: [],
          },
        });
      } catch (err) {
        expect(err.message).to.include(ERROR_MESSAGES.INVALID_TYPE_MESSAGE);
      }
    }).timeout(TIMEOUT);
    it('Should throw if shot array elements are invalid type', async () => {
      try {
        await store.set('myBattlezipProfile', {
          activeGame: {
            shipPositions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
            shots: [['1', '1', '1']],
          },
        });
      } catch (err) {
        expect(err.message).to.include(ERROR_MESSAGES.INVALID_TYPE_MESSAGE);
      }
    }).timeout(TIMEOUT);
  });

  describe('Test correct game state storage', async () => {
    it('Should be able to store correct input and read off of ceramic', async () => {
      const shot1 = [0, 0, 1];
      const shot2 = [0, 1, 0];

      await store.set('myBattlezipProfile', {
        activeGame: {
          shipPositions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          shots: [shot1, shot2],
        },
      });
      const res = await store.get('myBattlezipProfile');
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
    }).timeout(TIMEOUT);
  });
});
