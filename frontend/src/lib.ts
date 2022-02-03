import { SessionWallet, SignedTxn } from "algorand-session-wallet";
import algosdk, {
  AtomicTransactionComposer,
  OnApplicationComplete,
  TransactionType,
} from "algosdk";

export const algodClient = new algosdk.Algodv2(
  "a".repeat(64),
  "http://localhost",
  4001
);

export async function constructPaymentTxn(
  sender: string, receiver: string, amount: number
): Promise<algosdk.Transaction[]> {
  const sp = await algodClient.getTransactionParams().do();
  return [
    new algosdk.Transaction({
      from: sender,
      to: receiver,
      amount: amount,
      suggestedParams: sp,
    }),
  ];
}

export async function constructApplicationCreateTxn(
  sender: string
): Promise<algosdk.Transaction[]> {
  const sp = await algodClient.getTransactionParams().do();
  const approvalProgram = await getApprovalProgram();
  const clearProgram = await getClearProgram();

  return [
    new algosdk.Transaction({
      type:TransactionType.appl,
      from: sender,
      appIndex: 0, // Its a create
      appOnComplete: OnApplicationComplete.NoOpOC, // noop
      appGlobalByteSlices: 0,
      appGlobalInts: 0,
      appLocalByteSlices: 0,
      appLocalInts: 0,
      appApprovalProgram: approvalProgram,
      appClearProgram: clearProgram,
      suggestedParams: sp,
    }),
  ];
}

export async function constructApplicationCallComposer(
  appId: number,
  sw: SessionWallet
): Promise<AtomicTransactionComposer> {
  const sp = await algodClient.getTransactionParams().do();
  const contract = await getContractAPI();

  const signer = sw.getSigner()
  const atc = new algosdk.AtomicTransactionComposer();
  const ptxn = await constructPaymentTxn(sw.getDefaultAccount(), sw.getDefaultAccount(), 100)
  const ptxn_with_signer = {
      txn : ptxn[0],
      signer
  }

  atc.addMethodCall({
    appID: appId,
    method: getMethodByName(contract, "demo"),
    methodArgs: [ptxn_with_signer],
    sender: sw.getDefaultAccount(),
    signer: signer,
    suggestedParams: sp,
  });

  return atc;
}

export async function getPaymentTxnFromServer(
  sender: string, receiver: string, amount: number
): Promise<algosdk.Transaction[]> {
  const response = await window.fetch("/get_payment", {
    method: "POST",
    body: JSON.stringify({ sender, receiver, amount }),
  });

  const { data } = await response.json();
  return parseTransactions(data);
}

export async function triggerApplicationCreate(): Promise<number> {
  const response = await window.fetch("/deploy_app", { 
    method: "POST", 
  });
  const data  = await response.json();
  return data['AppID']
}

export async function getApplicationCallFromServer(
  appId: number, sender: string
): Promise<algosdk.Transaction[]> {
  const response = await window.fetch("/get_application_call", {
    method: "POST",
    body: JSON.stringify({ sender, appId }),
  });

  const { data } = await response.json();

  return parseTransactions(data);
}

export async function sendWait(signed: SignedTxn[]): Promise<any> {
    const {txId}  = await algodClient.sendRawTransaction(signed.map((t)=>{return t.blob})).do()
    const result = await algosdk.waitForConfirmation(algodClient, txId, 3)
    return result 
}

// Utility function to return an ABIMethod by its name
function getMethodByName(
  contract: algosdk.ABIContract,
  name: string
): algosdk.ABIMethod {
  const m = contract.methods.find((mt: algosdk.ABIMethod) => {
    return mt.name === name;
  });
  if (m === undefined) throw Error("Method undefined: " + name);
  return m;
}

interface ServerTxn {
    txn: string
}
function parseTransactions(payload: ServerTxn[]): algosdk.Transaction[] {
  return payload.map((t) => {
    return algosdk.decodeUnsignedTransaction(Buffer.from(t.txn, "base64"));
  });
}

async function getContractAPI(): Promise<algosdk.ABIContract> {
  const resp = await fetch("/static/demo_contract.json");
  return new algosdk.ABIContract(await resp.json());
}

async function getApprovalProgram(): Promise<Uint8Array> {
  const resp = await fetch("/static/demo.teal");
  const src = await resp.text();
  const result = await algodClient.compile(src).do();
  console.log("result", result)
  return new Uint8Array(Buffer.from(result["result"], "base64"));
}

async function getClearProgram(): Promise<Uint8Array> {
  const resp = await fetch("/static/clear.teal");
  const src = await resp.text();
  const result = await algodClient.compile(src).do();
  return new Uint8Array(Buffer.from(result["result"], "base64"));
}


export function download_txns(name: string, txns: Uint8Array[]) {
    let b = new Uint8Array(0);
    for(const txn in txns){
        b = concatTypedArrays(b, txns[txn])
    }
    var blob = new Blob([b], {type: "application/octet-stream"});

    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = name;
    link.click();
}

export function concatTypedArrays(a: any, b: any) {
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}