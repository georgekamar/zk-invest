# ZK-Invest UI

Front-End UI for ZK-Invest

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Project Structure

This is a Next.js project that uses the default structure used by the Next.js framework. The `pages`, `public`, `styles` directories correspond to the ReactJS components for the website pages, the website's public content accessible from the root  website directory, and the component styling, respectively.

The `public` folder contains the circuit `wasm` files and `zkey` files from the circuit build step in [`/back/README.md`](/back/README.md). And the `contracts` folder contains the deployed contracts ABIs from the contract compilation step in [`/back/README.md`](/back/README.md).

The `lib` folder contains the functions used to interact with the smart contract. These are the functions used to create the transactions, encrypt and decrypt the, generate and use keypairs, and make calculations specific to the contract state storage and display.

The `components` folder contains the React components used in the website.

## Running Locally

##### Prerequisites:
- Start the hardhat local network and deploy the contracts on it ([see `/back/README.md`](/back/README.md)).
- Install MetaMask on the browser you will be using.

##### Getting Started:

Install the dependencies:

```
yarn
```

Run the development server:

```bash
npm run dev
# or
yarn dev
```
The browser should open a new window on http://localhost:3000. Connect Metamask and switch to localhost network. Be sure to change your env variables accordingly ([see `/front/.env.example`](/front/.env.example)). The `_ADDRESS` suffix variables should be the addresses of the corresponding contracts deployed on hardhat's network. The `NEXT_PUBLIC_` prefix tells Next.js to give the client access to these variables. Be sure to set `NEXT_PUBLIC_ALLOW_LOCAL_CHAIN` to `Y` to allow the app to work on the local network.

## Deploy on Vercel

The easiest way to deploy a Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

See [Next.js deployment documentation](https://nextjs.org/docs/deployment).
