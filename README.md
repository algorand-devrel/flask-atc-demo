# ATC Demo with Flask and React

This repo includes two frontends to demonstrate how the Atomic Transaction Composer can be used in either Python (using Flask) or JavaScript (using React). The Atomic Transaction Composer doesn't replace existing methods, but rather helps in the construction of more complicated arrangements of group transactions. The reader is advised to have prior experience with the Algorand SDKs, sandbox, and familiarity creating individual transactions.

The backend (Flask) is hardcoded to use a [sandbox](https://github.com/algorand/sandbox) environment on a private blockchain. It will not work if you're using Testnet or Mainnet. When your sandbox instance it running it should provide you with 3 funded accounts. The first of these is used as the "creator" account for deploying the application and for funding your own account. You may export another of these accounts, or use a completely separate account in AlgoSigner.

## Features

This application offers two examples for using the ATC. The first is creation of a single Payment transaction, and the second is creating an Application call that requires a Payment transaction to be part of the atomic group.

The demo also provides two additional functions to help use with using external wallet. A way to fund an account (like a faucet sending you 10 Algo) and a convenient way to deploy the application used in the ATC demo.

## Usage

It's recommended that you use AlgoSigner for this example, as the Flask example expects the AlgoSigner javascript object to be available when detecting the first address in your wallet. You're welcome to use the React frontend instead which supports more wallets. The only additional step is to launch React after step 2.

1. Reset Sandbox
2. Launch Flask
3. Navigate to http://127.0.0.1:5000/
4. Fund your account using the "Send Me ALGO" button.
5. Deploy the demo application with the "Deploy App" button.
6. Now you can use either of the "Make Payment" or "Make Application Call" buttons to have the backend create an attomic transaction group using the ATC.

!!!note
    Please be aware that the Flask instance is required to be running regardless of which interface being used, as the backend samples are in Python only.

## Flask Interface

URL: http://127.0.0.1:5000/

You can launch the stand alone Flask demo by simply following the commands listed below, which will be required even if you want to run the React UI.

```sh
pip install -r requirements
FLASK_APP=main.py FLASK_ENV=development flask run
```

To see the ATC calls within the backend (in Python), open the `main.py` file and navigate to line 135.

## React Interface

URL: http://127.0.0.1:3000/

Within the `frontend` folder you can use node to run a React frontend. This demonstrates how to construct transactions using the ATC on the frontend, or by making requests to the backend (using Flask) which constructes the same transactions via ATC and passes them back to the frontend.

```sh
cd frontend
npm install
# Any version over 16 requires the openssl legacy flag.
export NODE_OPTIONS=--openssl-legacy-provider
node start
```

