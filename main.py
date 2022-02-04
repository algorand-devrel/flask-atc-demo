#!/usr/bin/env python3

import json
from flask import Flask, request
from flask import render_template
from algosdk import kmd
from algosdk import mnemonic, v2client
from algosdk.abi import Contract
from algosdk.encoding import (
    base64,
    is_valid_address,
    msgpack,
    msgpack_encode,
    future_msgpack_decode
)
from algosdk.future.transaction import (
    OnComplete,
    StateSchema,
    PaymentTxn,
    AssetTransferTxn,
    ApplicationCreateTxn,
    ApplicationCallTxn,
    SignedTransaction,
    wait_for_confirmation
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

# Sandbox Accounts
kmd_token = 'a' * 64
kmd_addr  = 'http://127.0.0.1:4002'
kmd_client = kmd.KMDClient(kmd_token, kmd_addr)

wallet_id = kmd_client.list_wallets()[0]['id']
wallet_hnd = kmd_client.init_wallet_handle(wallet_id, "")
accounts_pk = kmd_client.list_keys(wallet_hnd)
accounts_sk = {}
for acc in accounts_pk:
    accounts_sk[acc] = kmd_client.export_key(wallet_hnd, "", acc)
kmd_client.release_wallet_handle(wallet_hnd)

def get_method(c: Contract, name: str):
    for m in c.methods:
        if m.name == name:
            return m
    raise Exception("No method with the name {}".format(name))

def update_appid(app_id: int, genesis_hash: str):
    # Update the appID in the ABI.json file.
    with open('static/demo_interface.json') as json_file:
        abi = json.load(json_file)
    abi['networks'] = {genesis_hash: {'appID': app_id}}
    with open('static/demo_contract.json', 'w') as json_file:
        json.dump(abi, json_file, indent=4)

# Index
@app.route('/')
def root():
    return render_template('index.html')

# Deploy Demo.teal
@app.route("/deploy_app", methods=['POST'])
def deploy_app():
    deployer_pk = accounts_pk[0]

    # Get TEAL
    with open('static/demo.teal') as f:
        approval_teal = f.read()

    with open('static/clear.teal') as f:
        clear_teal = f.read()

    # Compile TEAL
    approval_prog = base64.b64decode(algod_client.compile(approval_teal)['result'])
    clear_prog = base64.b64decode(algod_client.compile(approval_teal)['result'])

    # Deploy
    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000
    deploy_txn = ApplicationCreateTxn(
        deployer_pk,
        sp,
        OnComplete.NoOpOC,
        approval_prog,
        clear_prog,
        StateSchema(0, 0),
        StateSchema(0, 0)
    )
    deploy_stxn = deploy_txn.sign(accounts_sk[deployer_pk])

    txid = algod_client.send_transaction(deploy_stxn)
    res = wait_for_confirmation(algod_client, txid)
    genesis_hash = sp.gh
    app_id = res['application-index']

    update_appid(app_id, genesis_hash)

    return {'success': True, 'AppID': app_id}

# Fund ALGO
@app.route("/fund_algo", methods=['POST'])
def fund_algo():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['receiver']):
        return {'success': False, 'message': "Receiver address invalid."}

    receiver = data['receiver']
    sender = accounts_pk[0]

    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000

    algo_txn = PaymentTxn(sender, sp, receiver, 10_000_000)
    algo_stxn = algo_txn.sign(accounts_sk[sender])

    txid = algod_client.send_transaction(algo_stxn)
    res = wait_for_confirmation(algod_client, txid)

    return {'success': True, 'message': "10 Algo sent."}

# Demo 1: Send Payment
@app.route("/get_payment", methods=['POST'])
def demo1():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['sender']):
        return {'success': False, 'message': "Sender address invalid."}
    if not is_valid_address(data['receiver']):
        return {'success': False, 'message': "Receiver address invalid."}
    if not isinstance(data['amount'], int):
        return {'success': False, 'message': "Amount not valid."}

    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000

    atc = AtomicTransactionComposer()
    ats = AccountTransactionSigner(None)
    ptxn = PaymentTxn(data['sender'], sp, data['receiver'], data['amount'])
    tws = TransactionWithSigner(ptxn, ats)
    atc.add_transaction(tws)

    txgroup = []
    for tx in atc.build_group():
        txgroup.append({'txn': msgpack_encode(tx.txn)})

    return {'success': True, 'data': txgroup}

# Demo 2: Payment + Asset Transfer + Application Call
@app.route("/get_application_call", methods=['POST'])
def demo2():
    # Verify they sent us the data we need.
    data = json.loads(request.data)
    if not is_valid_address(data['sender']):
        return {'success': False, 'message': "Sender address invalid."}

    sp = algod_client.suggested_params()
    sp.flat_fee = True
    sp.fee = 1_000

    with open("static/demo_contract.json") as f:
        js = f.read()

    contract = Contract.from_json(js)
    app_id = contract.networks[sp.gh].app_id

    atc = AtomicTransactionComposer()
    ats = AccountTransactionSigner(None)

    ptxn = PaymentTxn(data['sender'], sp, data['sender'], 1)
    aptxn = ApplicationCallTxn(data['sender'], sp, app_id, OnComplete.NoOpOC)

    ptws = TransactionWithSigner(ptxn, ats)
    aptws = TransactionWithSigner(aptxn, ats)

    atc.add_method_call(
        app_id,
        get_method(contract, "demo"),
        data['sender'],
        sp,
        aptws,
        method_args=[ptws]
    )

    txgroup = []
    for tx in atc.build_group():
        txgroup.append({'txn': msgpack_encode(tx.txn)})

    return {'success': True, 'data': txgroup}

# Ingest Signed Transactions and submit them to the node.
@app.route("/submit", methods=['POST'])
def submit():
    stxns = []
    for t in json.loads(request.data):
        #print(t['txID'])
        #print(t['blob'])
        #stx = base64.b64decode(t['blob'])
        stx = future_msgpack_decode(t['blob'])
        stxns.append(stx)

    algod_client.send_transactions(stxns)

    return {'success': True, 'message': "Transactions received."}

