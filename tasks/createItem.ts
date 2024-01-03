import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplace } from "../typechain";

task("createItem", "Creates a new NFT in the marketplace")
  .addParam("marketplace", "The address of the NFTMarketplace contract")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const marketplace: NFTMarketplace = <NFTMarketplace>(
        await hre.ethers.getContractAt(
          "NFTMarketplace",
          taskArgs.marketplace as string
        )
      );

      await marketplace.createItem();

      const filter = marketplace.filters.ItemCreated();
      const events = await marketplace.queryFilter(filter);
      const newItemId = events[0].args["tokenId"];
      const newItemCreator = events[0].args["owner"];

      console.log(`New NFT with ID ${newItemId} created`);
      console.log(`The token's creator is ${newItemCreator}`);
    }
  );
