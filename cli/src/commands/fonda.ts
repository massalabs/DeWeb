import { Argument, Command } from '@commander-js/extra-typings'
import { JsonRpcPublicProvider } from '@massalabs/massa-web3'
import { writeFileSync } from 'fs'
import { stringify } from 'csv-stringify/sync'

function writeWebsitesToCSV(websites: Website[], filePath: string) {
    const csvData = websites.map(website => ({
        address: website.address,
        domain: website.domain?.join(';') || '',
        owner: website.owner || '',
        immutable: website.immutable ? 'true' : 'false',
        title: website.title || '',
        description: website.description || '',
        keywords: website.keywords?.join(';') || '',
    }));

    const csv = stringify(csvData, {
        header: true,
        columns: {
            address: 'Address',
            domain: 'Domain',
            owner: 'Owner',
            immutable: 'Immutable',
            title: 'Title',
            description: 'Description',
            keywords: 'Keywords',
        }
    });

    writeFileSync(filePath, csv);
}

export const fondaCommand = new Command('fonda')
    .description('Creates a CSV file with all websites of the blockchain with their owner address, related mns...')
    .addArgument(new Argument('<output_file_path>', 'Path of the output file').argOptional().default('output.csv'))
    .action(async (filePath) => {
        const outputPath = filePath as string;
        const publicProvider = JsonRpcPublicProvider.mainnet()
        const nodeUrl = (await publicProvider.networkInfos()).url;
        if (!nodeUrl) {
            throw new Error("Network error idk shouldn't happen wtf ???")
        }
        console.log("Fetching websites from index...")
        const websites = await getAllWebsitesFromIndex(publicProvider)

        console.log("Checking immutability...")
        for (const website of websites) {
            const immutables = await isImmutable(website.address, nodeUrl);
            website.immutable = immutables;
        }

        console.log("Fetching metadata...")
        for (const website of websites) {
            const metadata = await getWebsiteMetadata(publicProvider, website.address);
            website.title = metadata.title;
            website.description = metadata.description;
            website.keywords = metadata.keywords;
            website.lastUpdate = metadata.lastUpdate;
        }

        console.log("Writing to file...")
        writeWebsitesToCSV(websites, outputPath);
        console.log("Done")
    })

import {
    Address,
    Args,
    bytesToStr,
    MNS_CONTRACTS,
    PublicAPI,
    PublicProvider,
    strToBytes,
} from "@massalabs/massa-web3";
import { getIndexSCAddress } from '../lib/index/utils'
import { isImmutable } from '../lib/website/immutable'
import { getWebsiteMetadata } from '../lib/website/metadata'

const prefix = strToBytes("\x01");

const DOMAIN_SEPARATOR_KEY = [0x42];
// eslint-disable-next-line  @typescript-eslint/no-magic-numbers
const ADDRESS_KEY_PREFIX_V2 = [0x6];

export interface Website {
    address: string;
    domain: string[];
    owner?: string;
    immutable?: boolean;
    title?: string;
    description?: string;
    keywords?: string[];
    lastUpdate?: string;
}
/**
 * Fetches all websites from the indexer SC
 */
export async function getAllWebsitesFromIndex(
    publicProvider: PublicProvider
): Promise<Website[]> {
    const indexAddresses: { address: string, owner: string }[] = [];
    const scAddress = getIndexSCAddress((await publicProvider.networkInfos()).chainId)
    const indexKeys = await publicProvider.getStorageKeys(scAddress, prefix); // Get index SC keys

    if (indexKeys.length === 0) {
        return [];
    }

    for (const key of indexKeys) {
        const keyValue = key.slice(prefix.length);
        try {
            const address = getAddress(keyValue);
            const owner = keyValue.slice(prefix.length + 3 + address.length);
            const ownerAddress = Address.fromString(bytesToStr(owner));
            indexAddresses.push({ address, owner: ownerAddress.toString() });
        } catch (e) {
            console.error("error fetching address in index with error:", e);
        }

    }

    // fail safe --> if no valid addresses found in index SC
    if (indexAddresses.length === 0) throw new Error("No valid addresses found");

    return processIndexAddresses(indexAddresses, publicProvider);
}

function getAddress(key: Uint8Array): string {
    try {
        const args = new Args(key);
        const addr = args.nextString();
        return Address.fromString(addr).toString();
    } catch (e) {
        console.error("error", e);
        return "";
    }
}

/**
 * Fetches all websites from the indexer SC
 * @param indexAddresses - list of addresses to fetch from the indexer
 * @param publicProvider - public provider to fetch data from
 * @returns list of websites
 */
async function processIndexAddresses(
    indexAddresses: { address: string, owner: string }[],
    publicProvider: PublicProvider
): Promise<Website[]> {
    const networkInfo = await publicProvider.networkInfos();
    const networkUrl = networkInfo.url;
    if (!networkUrl) {
        throw new Error("No network url found");
    }

    const mnsContract =
        MNS_CONTRACTS[networkInfo.name as keyof typeof MNS_CONTRACTS];

    const filterLookup = createFilterLookup(indexAddresses.map(i => i.address));

    const publicAPI = new PublicAPI(networkUrl);
    const addrInfo = await publicAPI.getAddressInfo(mnsContract);
    const keys = addrInfo.final_datastore_keys;

    const domains = extractDomains(keys, filterLookup);

    return mergeDomains(domains, indexAddresses);
}

/**
 * Creates a map of filters to addresses
 * @param indexAddresses - list of addresses to fetch from the indexer
 * @returns map of filters to addresses
 */
function createFilterLookup(indexAddresses: string[]): Map<string, string> {
    const filterLookup = new Map<string, string>();
    indexAddresses.forEach((target) => {
        const targetBytes = strToBytes(target);
        const filter = Uint8Array.from([
            ...DOMAIN_SEPARATOR_KEY,
            ...ADDRESS_KEY_PREFIX_V2,
            targetBytes.length,
            ...targetBytes
        ]);
        filterLookup.set(filter.toString(), target);
    });

    return filterLookup;
}

/**
 * Extracts domains from the datastore keys
 * @param keys - list of keys to extract domains from
 * @param filterLookup - map of filters to addresses
 * @returns list of domains
 */
function extractDomains(
    keys: Uint8Array[],
    filterLookup: Map<string, string>
): Website[] {
    const domains: Website[] = [];

    keys.forEach((key) => {
        const keyPrefix = key.slice(
            0,
            DOMAIN_SEPARATOR_KEY.length +
            ADDRESS_KEY_PREFIX_V2.length +
            1 +
            key[DOMAIN_SEPARATOR_KEY.length + ADDRESS_KEY_PREFIX_V2.length]
        );

        const address = filterLookup.get(keyPrefix.toString());
        if (address) {
            const domainBytes = key.slice(keyPrefix.length);
            const domain = bytesToStr(Uint8Array.from(domainBytes));
            domains.push({ address, domain: [domain] });
        }
    });

    return domains;
}

/**
 * Merges domains with the same address into a single website
 * @param domains - list of domains to merge
 * @returns list of websites with merged domains
 */
function mergeDomains(
    domains: Website[],
    indexAddresses: { address: string, owner: string }[]
): Website[] {
    const mergedDomains: Website[] = [];
    domains.forEach((domain) => {
        const owner = indexAddresses.find((i) => i.address === domain.address)?.owner;
        const existing = mergedDomains.find((d) => d.address === domain.address);
        if (existing) {
            existing.domain.push(...domain.domain);
            existing.owner = owner;
        } else {
            mergedDomains.push({ ...domain, owner });
        }
    });

    return mergedDomains;
}