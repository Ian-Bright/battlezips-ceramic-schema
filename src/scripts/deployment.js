import dotenv from 'dotenv';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { ModelManager } from '@glazed/devtools';
import { fromString } from 'uint8arrays/from-string';
import fs from 'fs';

dotenv.config();

const { API_URL, DID_SEED } = process.env;
const DEPLOY_DIR = './src/deployment';

const authenticateDID = async () => {
  const key = fromString(DID_SEED, 'base16');
  const did = new DID({
    provider: new Ed25519Provider(key),
    resolver: getResolver(),
  });
  await did.authenticate();
  return did;
};

const createDefinition = async (manager, schemaID) => {
  return await manager.createDefinition('myBattlezipProfile', {
    name: 'My Battlezip Profile',
    description: 'Definition of Battlezip profile',
    schema: manager.getSchemaURL(schemaID),
  });
};

const createSchema = async (manager) => {
  return await manager.createSchema('Battlezips', {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Battlezips',
    type: 'object',
    properties: {
      activeGame: {
        type: 'object',
        description: 'State of active game a user is playing',
        title: 'Active Game',
        properties: {
          adversaryProof: {
            // Adversary proof initally null if you have started game
            type: ['string', 'null'],
            description: 'ZK Proof for game adversary',
          },
          adversaryPubkey: {
            // Adversary public key initally null if you have started game
            type: ['string', 'null'],
            description: 'Public key of game adversary',
          },
          adversaryShots: {
            type: 'array',
            // Store x-cord, y-cord, and hit / miss (0 or 1)
            items: {
              type: 'array',
              items: {
                type: 'number',
              },
            },
          },
          shipPositions: {
            type: 'array',
            items: {
              type: 'array',
              items: {
                type: 'number',
              },
            },
            maxItems: 5,
            minItems: 5,
          },
          shots: {
            type: 'array',
            // Store x-cord, y-cord, and hit / miss (0 or 1)
            items: {
              type: 'array',
              items: {
                type: 'number',
              },
            },
          },
        },
        required: [
          'adversaryProof',
          'adversaryPubkey',
          'adversaryShots',
          'shipPositions',
          'shots',
        ],
        additionalProperties: false,
      },
      l2PrivKey: {
        type: 'object',
        description:
          'EDDSA encrypted private key to interact with Battlezips rollup',
        properties: {
          version: {
            type: 'string',
          },
          nonce: {
            type: 'string',
          },
          ephemPublicKey: {
            type: 'string',
          },
          ciphertext: {
            type: 'string',
          },
        },
        required: ['ciphertext', 'ephemPublicKey', 'nonce', 'version'],
        additionalProperties: false,
      },
    },
    required: ['activeGame', 'l2PrivKey'],
    additionalProperties: false,
  });
};

const createTile = async (manager, schemaID) => {
  return await manager.createTile(
    'exampleBattlezipProfile',
    {
      activeGame: {
        adversaryProof: null,
        adversaryPubkey: null,
        adversaryShots: [],
        shipPositions: [[], [], [], [], []],
        shots: [],
      },
      l2PrivKey: {
        ciphertext: '',
        ephemPublicKey: '',
        nonce: '',
        version: '',
      },
    },
    { schema: manager.getSchemaURL(schemaID) }
  );
};

const deploy = async () => {
  const { manager } = await instantiateClientAndManager();
  const schemaID = await createSchema(manager);
  console.log(`Schema created with ID: ${schemaID}`);
  const definitionID = await createDefinition(manager, schemaID);
  console.log(`Definition created with ID: ${definitionID}`);
  const tileID = await createTile(manager, schemaID);
  console.log('Tile created with ID: ', tileID);
  console.log('Deploying model...');
  const model = await manager.deploy();
  if (!fs.existsSync(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR);
  }
  fs.writeFileSync(`${DEPLOY_DIR}/deployment.json`, JSON.stringify(model));
  console.log(`Model deployed and written to ${DEPLOY_DIR}/deployment.js.`);
};

const instantiateClientAndManager = async () => {
  const authedDID = await authenticateDID();
  const ceramic = new CeramicClient(API_URL);
  ceramic.did = authedDID;
  const manager = new ModelManager({ ceramic });
  return { ceramic, manager };
};

deploy();
