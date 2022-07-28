import { CeramicClient } from '@ceramicnetwork/http-client';
import { DataModel } from '@glazed/datamodel';
import { DID } from 'dids';
import { DIDDataStore } from '@glazed/did-datastore';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { fromString } from 'uint8arrays/from-string';
import { getResolver } from 'key-did-resolver';
import modelAliases from '../deployment/deployment.json' assert { type: 'json' };
import { expect } from 'chai';

const { API_URL } = process.env;

// TODO: Auto generate DIDs
// const did1 = 'did:key:z6MkhFtXTbV4wyKZKBCNpEufEbZDpdVryqXhs9LCpGDGq5pT';
// const did2 = 'did:key:z6MkruWVfxoz8dTo5n3PtazjQqCHZdnpLUxbRsdKimQGxi3c';

const SEED_1 =
  '33662f17a0c92b674132326b4753e08f1b3be73c0a9c5ea8930e4072469cbb85';
const SEED_2 =
  'c04936bc7648cfe7825a5848c05659619addf59405f855527522ae2d0be67cef';

const authenticateDID = async (seed) => {
  const key = fromString(seed, 'base16');
  const did = new DID({
    provider: new Ed25519Provider(key),
    resolver: getResolver(),
  });
  await did.authenticate();
  return did;
};

describe('Test Battlezip game', async () => {
  let ceramic1;
  let ceramic2;
  let did1;
  let did2;
  let store1;
  let store2;

  // Authenticate both DIDs
  before(async () => {
    console.log('Authenticating DID 1...');
    did1 = await authenticateDID(SEED_1);
    console.log('DID 1 authenticated.');
    console.log('Authenticating DID 2...');
    did2 = await authenticateDID(SEED_2);
    console.log('DID 2 authenticated.');
    console.log('API URL: ', API_URL);
    ceramic1 = new CeramicClient(API_URL);
    ceramic2 = new CeramicClient(API_URL);
    ceramic1.did = did1;
    ceramic2.did = did2;
    const model = new DataModel({ ceramic: ceramic1, aliases: modelAliases });
    store1 = new DIDDataStore({ ceramic: ceramic1, model });
    store2 = new DIDDataStore({ ceramic: ceramic2, model });
  });

  describe('Profile states', async () => {
    it('No games should exist for account1', async () => {
      const did1Profile = await store1.get('myBattlezipProfile');
      expect(did1Profile).to.equal(null);
    });
    it('No games should exist for account 2', async () => {
      const did2Profile = await store2.get('myBattlezipProfile');
      expect(did2Profile).to.equal(null);
    });
  });

  describe('Test profile assignments', async () => {
    xit('Should revert if Battlezip profile is initialized without either required parameters', async () => {
      try {
        await store1.set('myBattlezipProfile', {
          text: 'Invalid input.',
        });
      } catch (err) {
        console.log('Error: ', err);
      }
    }).timeout(10000);
    it('Should revert if Battlezip profile is initialized without one required parameter', async () => {
      try {
        await store1.set('myBattlezipProfile', {
          totalGames: 0,
        });
      } catch (err) {
        console.log('Error: ', err);
      }
    }).timeout(10000);
  });
});
