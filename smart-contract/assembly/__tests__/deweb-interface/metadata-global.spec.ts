import { resetStorage, setDeployContext } from '@massalabs/massa-as-sdk';
import { constructor } from '../../contracts/deweb-interface';
import { Args } from '@massalabs/as-types';
import { Metadata } from '../../contracts/serializable/Metadata';
import {
  _addGlobalMetadata,
  _assertGlobalMetadata,
  _assertGlobalMetadataRemoved,
  _removeGlobalMetadata,
} from './helpers/global-metadata';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const metadataKey1 = 'version';
const metadataValue1 = '1.0.0';

const metadata1 = new Metadata(metadataKey1, metadataValue1);

describe('Upload files', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user);
    constructor(new Args().serialize());
  });

  test('Edit global metadata', () => {
    _addGlobalMetadata([metadata1]);
    _assertGlobalMetadata([metadata1]);
  });

  test('Remove global metadata', () => {
    _addGlobalMetadata([metadata1]);
    _assertGlobalMetadata([metadata1]);

    _removeGlobalMetadata([metadata1]);
    _assertGlobalMetadataRemoved([metadata1]);
  });

  throws('if try to remove non-existing global metadata', () => {
    _removeGlobalMetadata([metadata1]);
  });
});
