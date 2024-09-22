const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const { NETWORK } = require(`${basePath}/constants/network.js`);

const network = NETWORK.eth;

// General metadata for your NFTs
const namePrefix = "Grumpy Generation";
const description = "Nobody can stop us!";
const external_url = "";
const baseUri = "https://nftstorage.link/ipfs/bafybeihxqkih2kxscy47m3ncxj244qf6bpxijzbzd3vnlxsp2hv6oa3kli";

const solanaMetadata = {
  symbol: "YC",
  seller_fee_basis_points: 1000, // Define how much % you want from secondary market sales 1000 = 10%
  external_url: "https://www.youtube.com/c/hashlipsnft",
  creators: [
    {
      address: "7fXNuer5sbZtaTEPhtJ5g5gNtuyRoKkvxdjEjEnPN4mC",
      share: 100,
    },
  ],
};

// The amount of NFTs you want to create and the layers you want to use equals the Edition Size
// Make sure that your layers are in the right order and match the names within the layers folder 
const layerConfigurations = [
  {
    growEditionSizeTo: 10,
    layersOrder: [
      { name: "BACKGROUND" },
      { name: "BASE GRUMPY" },
      { name: "EYEZ" },
      { name: "OUTFITZ" },
      //{ name: "SPECIALZ" },
      { name: "FACE TRAITZ" },
      { name: "NECK TRAITZ" },
      { name: "UPPER TRAITZ" },
      //{ name: "Bottom lid" },
      //{ name: "Top lid" },
    ],
  },
];

const shuffleLayerConfigurations = false;

const debugLogs = false;

// This is the resolution 1000x1000 pixels is standard
const format = {
  width: 1000,
  height: 1000,
  smoothing: false,
};

// Everything below is irrelevant for a regular collection
const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 500,
};

const text = {
  only: false,
  color: "#ffffff",
  size: 20,
  xGap: 40,
  yGap: 40,
  align: "left",
  baseline: "top",
  weight: "regular",
  family: "Courier",
  spacer: " => ",
};

const pixelFormat = {
  ratio: 2 / 128,
};

const background = {
  generate: true,
  brightness: "100%",
  static: false,
  default: "#000000",
};

const extraMetadata = {};

const rarityDelimiter = "#";

const uniqueDnaTorrance = 10000;

const preview = {
  thumbPerRow: 5,
  thumbWidth: 50,
  imageRatio: format.height / format.width,
  imageName: "preview.png",
};

const preview_gif = {
  numberOfImages: 5,
  order: "ASC", // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 500,
  imageName: "preview.gif",
};

module.exports = {
  format,
  baseUri,
  description,
  external_url,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  pixelFormat,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
  preview_gif,
};
