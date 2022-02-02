#!/usr/bin/env python3

import json
from flask import Flask, request
from flask import render_template
from algosdk import mnemonic, v2client
from algosdk.abi import contract
from algosdk.encoding import (
    base64,
    is_valid_address,
    msgpack,
    msgpack_encode
)
from algosdk.future.transaction import PaymentTxn
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AccountTransactionSigner,
    TransactionWithSigner
)

app = Flask(__name__)

# Sandbox Node
algod_token  = 'a' *64
algod_addr   = 'http://127.0.0.1:4001'
algod_client = v2client.algod.AlgodClient(algod_token, algod_addr)

# Index
@app.route('/')
def root():
    return render_template('index.html')

# API to get unisnged transactions
@app.route("/get_txns", methods=['POST'])
def atc_demo():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['sender']):
        return {'success': False, 'message': "Sender address invalid."}
    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000
    atc = AtomicTransactionComposer()
    ats = AccountTransactionSigner(None) # We don't have the signers private key.
    ptxn1 = PaymentTxn(data['sender'], sp, data['sender'], 1)
    ptxn2 = PaymentTxn(data['sender'], sp, data['sender'], 2)
    tws1 = TransactionWithSigner(ptxn1, ats)
    tws2 = TransactionWithSigner(ptxn2, ats)
    atc.add_transaction(tws1)
    atc.add_transaction(tws2)

    txgroup = []
    for tx in atc.build_group():
        txgroup.append({'txn': msgpack_encode(tx.txn)})

    return {'success': True, 'data': txgroup}

# API to send signed transactions
@app.route("/send_signed_txns", methods=["POST"])
def atc_demo2():
    atc = AtomicTransactionComposer()
    for t in json.loads(request.data):
        print(t['txID'])
        print(t['blob'])
        atc.gather_signatures
    return {'success': True, 'message': "Transactions received."}

