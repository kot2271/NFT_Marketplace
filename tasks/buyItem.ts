import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplace } from "../typechain";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

task("buyItem", "Purchases a listed NFT from the marketplace")
  .addParam("marketplace", "The address of the NFTMarketplace contract")
  .addParam("tokenId", "The ID of the NFT to buy")
  .addParam("amount", "The payment amount in ETH")
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
      const paymentAmount: BigNumber = ethers.utils.parseEther(
        taskArgs.amount.toString()
      );

      await marketplace.buyItem(tokenId, { value: paymentAmount });

      const filter = marketplace.filters.ItemPurchased();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txBuyer = events[0].args["buyer"];
      const txPrice = events[0].args["price"];

      const etherPrice = ethers.utils.formatEther(txPrice);

      console.log(`NFT with ID ${txTokenId} purchased successfully`);
      console.log(`Buyer is: ${txBuyer}`);
      console.log(`Payment amount ${etherPrice} ETH`);
    }
  );
