#!/usr/bin/env python3

import json
from flask import Flask, request
from flask import render_template
from algosdk import mnemonic, v2client
from algosdk.abi import Contract
from algosdk.encoding import (
    base64,
    is_valid_address,
    msgpack,
    msgpack_encode
)
from algosdk.future.transaction import (
    OnComplete,
    PaymentTxn,
    AssetTransferTxn,
    ApplicationCallTxn
)
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

def get_method(c: Contract, name: str):
    for m in c.methods:
        if m.name == name:
            return m
    raise Exception("No method with the name {}".format(name))

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

# Demo 1: Payment
@app.route("/get_demo1", methods=['POST'])
def demo1():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['sender']):
        return {'success': False, 'message': "Sender address invalid."}

    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000

    atc = AtomicTransactionComposer()
    ats = AccountTransactionSigner(None)
    ptxn = PaymentTxn(data['sender'], sp, data['sender'], 1)
    tws = TransactionWithSigner(ptxn, ats)
    atc.add_transaction(tws)

    txgroup = []
    for tx in atc.build_group():
        txgroup.append({'txn': msgpack_encode(tx.txn)})

    return {'success': True, 'data': txgroup}

# Demo 2: Payment + Asset Transfer
@app.route("/get_demo2", methods=['POST'])
def demo2():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['sender']):
        return {'success': False, 'message': "Sender address invalid."}

    asset_id = 5

    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000

    atc = AtomicTransactionComposer()
    ats = AccountTransactionSigner(None) # We don't have the signers private key.
    ptxn = PaymentTxn(data['sender'], sp, data['sender'], 1)
    attxn = AssetTransferTxn(data['sender'], sp, data['sender'], 2, asset_id)
    ptws = TransactionWithSigner(ptxn, ats)
    attws = TransactionWithSigner(attxn, ats)
    atc.add_transaction(ptws)
    atc.add_transaction(attws)

    txgroup = []
    for tx in atc.build_group():
        txgroup.append({'txn': msgpack_encode(tx.txn)})

    return {'success': True, 'data': txgroup}

# Demo 3: Payment + Asset Transfer + Application Call
@app.route("/get_demo3", methods=['POST'])
def demo3():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['sender']):
        return {'success': False, 'message': "Sender address invalid."}

    asset_id = 5

    with open("abi.json") as f:
        js= f.read()

    contract = Contract.from_json(js)

    app_id = contract.networks["3eaaT1N53+o6+zJfxMF2Nk5TnWVNre6BRF5hFy+ef8U="].app_id

    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000

    atc = AtomicTransactionComposer()
    ats = AccountTransactionSigner(None)

    ptxn = PaymentTxn(data['sender'], sp, data['sender'], 1)
    attxn = AssetTransferTxn(data['sender'], sp, data['sender'], 2, asset_id)
    aptxn = ApplicationCallTxn(data['sender'], sp, app_id, OnComplete.NoOpOC)

    ptws = TransactionWithSigner(ptxn, ats)
    attws = TransactionWithSigner(attxn, ats)
    aptws = TransactionWithSigner(aptxn, ats)

    atc.add_method_call(
        app_id,
        get_method(contract, "demo"),
        data['sender'],
        sp,
        aptws,
        method_args=[ptws, attws]
    )

    txgroup = []
    for tx in atc.build_group():
        txgroup.append({'txn': msgpack_encode(tx.txn)})

    return {'success': True, 'data': txgroup}

# Ingest Signed Transactions and submit them to the node.
@app.route("/submit", methods=['POST'])
def submit():
    for t in json.loads(request.data):
        print(t['txID'])
        print(t['blob'])

    return {'success': True, 'message': "Transactions received."}

