
# Enjin Chain Generative NFTs

Welcome to **Enjin Chain Generative NFTs** – a customized version of the popular HashLips Art Engine, optimized for Enjin Blockchain. This script allows you to create a large number of NFTs with random trait combinations, perfect for generative NFT collections.

> **Credits**: Full acknowledgment goes to the [HashLips Art Engine](https://github.com/HashLips/hashlips_art_engine). This version has been tweaked by me (Chris) to suit Enjin Blockchain’s specific requirements. I do not claim any rights to the original code and appreciate the hard work put into its development.  
> **Disclaimer**: This code is over a year old, and there may be recent updates I haven't incorporated. Please use it carefully and test on Canary first!

---

## 🌟 Key Features

- **Batch Generation**: Generate thousands of NFTs in a single operation using layered traits.
- **Flexible Trait System**: Organize your trait layers and assign probabilities to control rarity.
- **Easy to Customize**: Modify metadata such as name, description, and image URLs quickly.
- **Fast & Efficient**: Automatically create NFTs and corresponding metadata in one go.
- **JSON Metadata Generation**: Automatically generates the necessary metadata files for NFT marketplaces.

---

## 🚀 Getting Started

### Step 1: Installation and Setup

1. Download and unzip `Enjin-Generative-NFTs.zip`.
2. Open the folder in **Visual Studio Code** or your preferred editor.
3. Navigate to the `src` folder and open `config.js`. Here, you can:
   - On line 8 to 11, **edit the project name and description**.
   - On line 27 to 43, configure the **layers order** and the number of NFTs to generate. The default is 10, but you can increase this as desired.
   - I strongly recommend keeping everything else unchanged.

---

### Step 2: Editing Traits and Layers

1. Inside the `layers` folder, you can organize the traits of your NFTs. Each trait is saved as an image (e.g., `Blue#33.png`).
   - The PNG format guarantees that each trait remains transparent, allowing for proper layering.
   - The `#33` at the end represents the **probability** (33%) of this trait being used in your NFT generation.
2. If you change the name of any layer in the `layers` folder, make sure to update the **layer names** accordingly in the `config.js` file between **lines 27 to 43**.
   - This step is crucial for ensuring the layers and traits are properly used during the generation process.

---

### Step 3: Generate NFTs

1. Open a new terminal in Visual Studio Code.
2. Run the following command to start generating your NFTs:
   ```bash
   node index.js
   ```
3. The images and metadata will be saved to the `build` folder.

---

## 🌍 Hosting the Images

Once your images and `.json` files are generated, you will need to host the images online.

### Recommended Hosting Options:
- **Regular Hosting**: Use a server to host your images with a static link.
- **Decentralized Storage**: [NFT.Storage](https://nft.storage) offers a free decentralized hosting service for NFTs.

---

## 🔄 Updating JSON Metadata

To update the image URLs in your `.json` files:

1. Copy the `json` folder from the `build` directory to the `JSON IMAGE LINK EDIT` folder.
2. Open the `script.py` file in the `JSON IMAGE LINK EDIT` folder.
   - The **first link** is the current base URL in your `.json` files.
   - The **second link** is where your images are hosted (e.g., `https://nftstorage.link/ipfs/...`).
3. Run the `script.py` file to update all your `.json` files with the new image URL.
4. You can now upload the `.json` files just as you did with your images.

---

## 🛠 Final Notes

- This project is based on the [HashLips Art Engine](https://github.com/HashLips/hashlips_art_engine) and has been slightly modified to fit the Enjin Blockchain.
- It’s recommended to try everything on Canary first before deploying to the main network.
- If there are any issues, they may be due to changes since this script was first developed.

---

## 🚀 Batch Minting NFTs

Once you have everything ready, you may want to batch mint your NFTs. For this, you can use the [Enjin-Batch-Mint-And-Distribute](https://github.com/Chris21t/Enjin-NFT-Tools/tree/master/Enjin-Batch-Mint-And-Distribute) tool, which allows you to mint hundreds of NFTs in one go.

> **Recommendation**: Start by minting a small number of NFTs (e.g., 50) and gradually scale up. Testing on Canary is highly recommended. Based on experience, minting **250 NFTs in one go** should be a sufficient batch size.

Keep in mind that this code is over one year old as well, so there may be updates or changes you’ll need to adapt to.

---

**Happy Minting, and may your NFTs shine bright! XOXO Chris! 🎨🚀**
