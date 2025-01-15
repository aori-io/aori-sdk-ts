import { JsonRpcProvider, Wallet } from "ethers";

const publicClients = {
    // Mainnet
    1: [
        "https://eth.llamarpc.com",
        "https://rpc.eth.gateway.fm",
        "https://rpc.ankr.com/eth",
        "https://rpc.notadegen.com/eth",
        "https://ethereum.publicnode.com",
        "https://eth-mainnet.public.blastapi.io",
        "https://eth.drpc.org",
        "https://1rpc.io/eth",
        "https://eth-pokt.nodies.app",
        "https://eth.nodeconnect.org",
        "https://virginia.rpc.blxrbdn.com",
        "https://ethereum.blockpi.network/v1/rpc/public"
    ],
    // Goerli
    5: [
        "https://rpc.goerli.eth.gateway.fm",
        "https://rpc.ankr.com/eth_goerli",
        "https://goerli.blockpi.network/v1/rpc/public",
        "https://eth-goerli.public.blastapi.io",
        "https://goerli.gateway.tenderly.co"
    ],
    // Optimism Mainnet
    10: [
        "https://optimism.llamarpc.com",
        "https://mainnet.optimism.io",
        "https://optimism-mainnet.public.blastapi.io",
        "https://rpc.ankr.com/optimism",
        "https://1rpc.io/op",
        "https://op-pokt.nodies.app",
    ],
    // Binance Smart Chain Mainnet
    56: [
        "https://rpc.ankr.com/bsc",
        "https://bsc.rpcgator.com",
        "https://bsc.drpc.org",
        "https://1rpc.io/bnb",
        "https://binance.nodereal.io",
        "https://bscrpc.com"
    ],
    // Binance Smart Chain Testnet
    97: [
        "https://bsc-testnet.public.blastapi.io",
        "https://bsc-testnet-rpc.publicnode.com",
        "https://bsctestapi.terminet.io/rpc",
        "https://bsc-testnet.blockpi.network/v1/rpc/public",
        "https://api.zan.top/node/v1/bsc/testnet/public"
    ],
    // Gnosis Mainnet
    100: [
        "https://gnosis-mainnet.public.blastapi.io",
        "https://rpc.gnosischain.com",
        "https://rpc.gnosis.gateway.fm",
        "https://rpc.ankr.com/gnosis",
        "https://gnosis.blockpi.network/v1/rpc/public",
        "https://gnosis.drpc.org",
        "https://gnosis-rpc.publicnode.com",
        "https://1rpc.io/gnosis",
        "https://gnosis.oat.farm"
    ],
    // Polygon Mainnet
    137: [
        "https://polygon.llamarpc.com",
        "https://polygon.rpc.blxrbdn.com",
        "https://polygon-mainnet.public.blastapi.io",
        "https://polygon-rpc.com",
        "https://polygon-pokt.nodies.app",
        "https://rpc-mainnet.matic.quiknode.pro",
        "https://polygon.blockpi.network/v1/rpc/public",
        "https://rpc.ankr.com/polygon",
        "https://rpc-mainnet.matic.quiknode.pro",
        "https://gateway.tenderly.co/public/polygon"
    ],
    // Manta Pacific Mainnet
    169: [
        "https://pacific-rpc.manta.network/http",
        "https://1rpc.io/manta"
    ],
    // Fantom Opera
    250: [
        "https://rpcapi.fantom.network",
        "https://rpc.fantom.network",
        "https://1rpc.io/ftm",
        "https://fantom.blockpi.network/v1/rpc/public",
        "https://fantom-rpc.publicnode.com",
        "https://fantom.drpc.org",
        "https://rpc.fantom.gateway.fm"
    ],
    // zkSync Sepolia
    300: [
        "https://sepolia.era.zksync.dev"
    ],
    // zkSync Mainnet
    324: [
        "https://zksync.drpc.org",
        "https://1rpc.io/zksync2-era",
        "https://zksync-era.blockpi.network/v1/rpc/public"
    ],
    // Mode Sepolia
    919: [
        "https://sepolia.mode.network"
    ],
    // Morph Testnet
    2710: [
        "https://rpc-testnet.morphl2.io"
    ],
    // Fantom Testnet
    4002: [
        "https://rpc.ankr.com/fantom_testnet",
        "https://rpc.testnet.fantom.network",
        "https://fantom-testnet.public.blastapi.io"
    ],
    // Mantle Mainnet
    5000: [
        "https://rpc.mantle.xyz",
        "https://mantle-rpc.publicnode.com",
        "https://mantle.drpc.org",
        "https://rpc.ankr.com/mantle",
        "https://1rpc.io/mantle",
        "https://mantle-mainnet.public.blastapi.io"
    ],
    // Mantle Sepolia Testnet
    5003: [
        "https://rpc.sepolia.mantle.xyz"
    ],
    // Base Mainnet
    8453: [
        "https://base-pokt.nodies.app",
        "https://mainnet.base.org",
        "https://base.blockpi.network/v1/rpc/public",
        "https://1rpc.io/base",
        "https://base-mainnet.public.blastapi.io",
        "https://base.drpc.org",
        "https://base-rpc.publicnode.com",
    ],
    10200: [
        "https://rpc.chiadochain.net",
        "https://rpc.chiado.gnosis.gateway.fm",
        "https://gnosis-chiado-rpc.publicnode.com"
    ],
    // Artela Testnet
    11822: [
        "https://betanet-rpc1.artela.network"
    ],
    // Holesky Testnet
    17000: [
        "https://holesky.drpc.org",
        "https://ethereum-holesky-rpc.publicnode.com",
        "https://1rpc.io/holesky"
    ],
    // Mode Mainnet
    34443: [
        "https://mainnet.mode.network",
        "https://1rpc.io/mode"
    ],
    // Arbitrum One
    42161: [
        "https://arbitrum.llamarpc.com",
        "https://rpc.ankr.com/arbitrum",
        // "https://arb-pokt.nodies.app",
        "https://arbitrum.drpc.org",
        "https://arbitrum-one.public.blastapi.io",
    ],
    // Avalanche Fuji
    43113: [
        "https://rpc.ankr.com/avalanche_fuji",
        "https://api.avax-test.network/ext/bc/C/rpc",
        "https://avalanche-fuji-c-chain-rpc.publicnode.com",
        "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
    ],
    // Avalanche Mainnet
    43114: [
        "https://api.avax.network/ext/bc/C/rpc",
        "https://avalanche.public-rpc.com",
        "https://rpc.ankr.com/avalanche",
        "https://blastapi.io/public-api/avalanche",
        "https://1rpc.io/avax/c",
        "https://avalanche.blockpi.network/v1/rpc/public",
        "https://avalanche.drpc.org"
    ],
    // Linea Mainnet
    59144: [
        "https://1rpc.io/linea",
        "https://rpc.linea.build",
        "https://linea.blockpi.network/v1/rpc/public",
        "https://linea.drpc.org",
        "https://linea.decubate.com"
    ],
    // Berachain Artio
    80085: [
        "https://artio.rpc.berachain.com",
        "https://rpc.ankr.com/berachain_testnet"
    ],
    // Blast Mainnet
    81457: [
        "https://rpc.blast.io",
        "https://blastl2-mainnet.public.blastapi.io",
        "https://blast.blockpi.network/v1/rpc/public",
        "https://rpc.ankr.com/blast"
    ],
    // Base Sepolia
    84532: [
        "https://rpc.notadegen.com/base/sepolia",
        "https://sepolia.base.org",
        "https://base-sepolia-rpc.publicnode.com",
        "https://base-sepolia.blockpi.network/v1/rpc/public"
    ],
    // Arbitrum Sepolia
    421614: [
        "https://sepolia-rollup.arbitrum.io/rpc",
        "https://arbitrum-sepolia.drpc.org",
        "https://rpc.ankr.com/arbitrum_sepolia"
    ],
    // Scroll Sepolia Testnet
    534351: [
        "https://scroll-sepolia.blockpi.network/v1/rpc/public",
        "https://scroll-testnet-public.unifra.io",
        "https://rpc.ankr.com/scroll_sepolia_testnet",
        "https://scroll-public.scroll-testnet.quiknode.pro",
        "https://scroll-sepolia.chainstacklabs.com",
        "https://scroll-sepolia.drpc.org"
    ],
    // Scroll Mainnet
    534352: [
        "https://rpc.scroll.io",
        "https://rpc-scroll.icecreamswap.com",
        "https://scroll-mainnet.public.blastapi.io",
        "https://1rpc.io/scroll",
        "https://scroll.drpc.org",
        "https://rpc.ankr.com/scroll"
    ],
    // Sei Devnet
    713715: [
        "https://evm-rpc.arctic-1.seinetwork.io",
        "https://evm-rpc-arctic-1.sei-apis.com"
    ],
    912559: [
        "https://rpc.evm.dusk-3.devnet.astria.org"
    ],
    // Manta Pacific Testnet
    3441005: [
        "https://manta-testnet.calderachain.xyz/http"
    ],
    // Sepolia
    11155111: [
        "https://rpc2.sepolia.org",
        "https://eth-sepolia.public.blastapi.io",
        "https://sepolia.gateway.tenderly.co",
        "https://rpc-sepolia.rockx.com",
        "https://ethereum-sepolia.publicnode.com",
        "https://1rpc.io/sepolia",
        "https://rpc.sepolia.org",
        "https://eth-sepolia-public.unifra.io"
    ],
    // Optimism Sepolia
    11155420: [
        "https://sepolia.optimism.io",
        "https://rpc.ankr.com/optimism_sepolia"
    ],
    // Blast Sepolia Testnet
    168587773: [
        "https://blast-sepolia.blockpi.network/v1/rpc/public"
    ],
    // Neon EVM Devnet
    245022926: [
        "https://devnet.neonevm.org"
    ],
    // Neon EVM Mainnet
    245022934: [
        "https://neon-proxy-mainnet.solana.p2p.org"
    ],
}

export function getChainProvider(chainId: string | number): JsonRpcProvider {
    const c = (publicClients as any)[chainId] as string[];
    if (c == undefined) throw new Error(`Chain ${chainId} is not supported just yet`);
    const randomIndex = Math.round(Math.floor(Math.random() * c.length));
    const provider = new JsonRpcProvider(c[randomIndex], chainId as any, { staticNetwork: true });
    return provider;
}