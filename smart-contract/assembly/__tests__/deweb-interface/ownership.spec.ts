import { Args } from '@massalabs/as-types';
import {
  Address,
  get,
  getKeys,
  resetStorage,
  setDeployContext,
} from '@massalabs/massa-as-sdk';
import {
  constructor,
  transferOwnership,
} from '../../contracts/deweb-interface';
import { OWNER_KEY } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';

const user1 = new Address(
  'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq',
);
const user2 = new Address(
  'AU1Sxv7v8KZtYQHvAq1V8fB5z3QJ1Q5t7ccDeASEgbLPmMn4SVO1P',
);

describe('Ownership', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user1.toString());
    constructor(new Args().serialize());
  });

  test('transfer ownership', () => {
    transferOwnership(new Args().add(user2).serialize());

    const owner = get(OWNER_KEY);

    expect(owner).toStrictEqual(user2.toString(), 'Owner should be user2');
  });

  test('renounce ownership', () => {
    transferOwnership(new Args().serialize());

    const owner = get(OWNER_KEY);

    expect(owner).toHaveLength(0, 'Owner should be empty');
  });
});
