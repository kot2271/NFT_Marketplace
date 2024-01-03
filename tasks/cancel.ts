import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplace } from "../typechain";
import { BigNumber } from "ethers";

task("cancel", "Cancels an NFT listing from the marketplace")
  .addParam("marketplace", "The address of the NFTMarketplace contract")
  .addParam("tokenId", "The ID of the NFT listing to cancel")
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
      const tokenId: BigNumber = taskArgs.tokenId;

      await marketplace.cancel(tokenId);

      const filter = marketplace.filters.ListingCancelled();
      const events = await marketplace.queryFilter(filter);
      const cancelledItemId = events[0].args["tokenId"];

      console.log(`NFT listing ${cancelledItemId} cancelled successfully`);
    }
  );
