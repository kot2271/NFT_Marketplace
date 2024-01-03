import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplace } from "../typechain";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

task("listItem", "Lists an NFT for sale in the marketplace")
  .addParam("marketplace", "The address of the NFTMarketplace contract")
  .addParam("tokenId", "The ID of the NFT to list")
  .addParam("paymentToken", "The payment token address")
  .addParam("price", "The listing price in ETH")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> => {
      const marketplace: NFTMarketplace = <NFTMarketplace>(
        await hre.ethers.getContractAt(
          "NFTMarketplace",
          taskArgs.marketplace as string
        )
      );
      const tokenId: BigNumber = taskArgs.tokenId;
      const price: BigNumber = ethers.utils.parseEther(taskArgs.price.toString());
      const paymentToken: string = taskArgs.paymentToken;

      await marketplace.listItem(tokenId, price, paymentToken);

      const filter = marketplace.filters.ItemListed();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txPrice = events[0].args["price"];
      const txPaymentToken = events[0].args["paymentToken"];

      const etherPrice = ethers.utils.formatEther(txPrice);

      console.log(`NFT with ID ${txTokenId} listed for sale`);
      console.log(`NFT price is: ${etherPrice} ETH`);
      console.log(`Payment token address is: ${txPaymentToken}`);
    }
  );
