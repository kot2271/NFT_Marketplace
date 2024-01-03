import { getNamedAccounts, deployments } from "hardhat";
import { verify } from "../helpers/verify";

const NFT_CONTRACT_ADDRESS = "0x71c4a39fBc494E27d969A62d36e95373B6317B0d";
const CONTRACT_NAME = "NFTMarketplace";

async function deployFunction() {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const tokenArgs = [NFT_CONTRACT_ADDRESS];
  const contract = await deploy(CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: tokenArgs,
    waitConfirmations: 6,
  });
  console.log(`${CONTRACT_NAME} deployed at: ${contract.address}`);
  await verify(contract.address, tokenArgs);
}

deployFunction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
