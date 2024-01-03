# NFT Marketplace

## Installation

Clone the repository using the following command:
Install the dependencies using the following command:
```shell
npm i
```

## Deployment

Fill in all the required environment variables(copy .env-example to .env and fill it). 

Deploy contract to the chain (polygon-mumbai):
```shell
npx hardhat run scripts/deploy/deploy.ts --network polygonMumbai
```

## Verify

Verify the installation by running the following command:
```shell
npx hardhat verify --network polygonMumbai {CONTRACT_ADDRESS}
```

## Tasks

Create a new task(s) and save it(them) in the folder "tasks". Add a new task_name in the file "tasks/index.ts"

Running a grantArtistRole task:
```shell
npx hardhat grantArtistRole --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --to {GRANT_ROLE_TO} --network polygonMumbai
```

Running a createItem task:
```shell
npx hardhat createItem --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --network polygonMumbai
```

Running a listItem task:
```shell
npx hardhat listItem --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --token-id {NFT_TOKEN_ID} --payment-token {PAYMENT_TOKEN_ADDRESS} --price {PRICE_IN_ETH} --network polygonMumbai
```

Running a buyItem task:
```shell
npx hardhat buyItem --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --token-id {NFT_TOKEN_ID} --amount {AMOUNT_IN_ETH} --network polygonMumbai
```

Running a cancel task:
```shell
npx hardhat cancel --marketplace {MARKETPLACE_CONTRACT_ADDRESS} --token-id {NFT_TOKEN_ID} --network polygonMumbai
```
