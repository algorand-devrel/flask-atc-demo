import { SessionWallet } from "algorand-session-wallet";
import algosdk, { AtomicTransactionComposer, OnApplicationComplete } from "algosdk";

export const algodClient = new algosdk.Algodv2("a".repeat(64), "http://localhost", 4001)

// Utility function to return an ABIMethod by its name
function getMethodByName(contract: algosdk.ABIContract, name: string): algosdk.ABIMethod  {
    const m = contract.methods.find((mt: algosdk.ABIMethod)=>{ return mt.name===name })

    if(m === undefined)
        throw Error("Method undefined: "+name)

    return m
}

export async function constructPaymentTxn(sender: string): Promise<algosdk.Transaction[]>{
    const sp = await algodClient.getTransactionParams().do()

    return [new algosdk.Transaction({
        from: sender,
        to: sender,
        amount: 1,
        suggestedParams: sp
    })]
}



export async function constructApplicationCreateTxn(sender: string): Promise<algosdk.Transaction[]>{
    const sp = await algodClient.getTransactionParams().do()
    return [new algosdk.Transaction({
        from: sender,
        appIndex:0, // Its a create
        appOnComplete: OnApplicationComplete.NoOpOC, // noop
        appGlobalByteSlices: 0,
        appGlobalInts: 0,
        appLocalByteSlices: 0,
        appLocalInts: 0,
        appApprovalProgram: new Uint8Array(),
        appClearProgram: new Uint8Array(),
        suggestedParams: sp
    })]
}



export async function constructApplicationCallTxn(appId: number, sw: SessionWallet): Promise<AtomicTransactionComposer>{
    const sp = await algodClient.getTransactionParams().do()

    const resp = await fetch("/static/contract.json")

    const contract = new algosdk.ABIContract(await resp.json())

    const atc  = new algosdk.AtomicTransactionComposer()
    atc.addMethodCall({
        appID: appId, 
        method: getMethodByName(contract, "echo"), 
        methodArgs: [], 
        sender: sw.getDefaultAccount(), 
        signer:  sw.getSigner(),
        suggestedParams: sp,
    })

    return atc
}

interface ServerTxn {
  txn: string;
}

function parseTransactions(payload: ServerTxn[]): algosdk.Transaction[] {
  return payload.map((t) => {
    return algosdk.decodeUnsignedTransaction(Buffer.from(t.txn, "base64"));
  });
}

export async function getPaymentTxnFromServer(
  sender: string
): Promise<algosdk.Transaction[]> {

  const response = await window.fetch("/get_demo1", {
    method: "POST",
    body: JSON.stringify({sender}),
  });

  const { data } = await response.json();
  return parseTransactions(data);
}

export async function getApplicationCreateFromServer(sender: string): Promise<algosdk.Transaction[]> {
  const response = await window.fetch("/get_demo3", {
    method: "POST",
    body: JSON.stringify({sender}),
  });

  const { data } = await response.json();

  return parseTransactions(data);
}

export async function getApplicationCallFromServer(sender: string): Promise<algosdk.Transaction[]> {
  const response = await window.fetch("/get_demo3", {
    method: "POST",
    body: JSON.stringify({sender}),
  });

  const { data } = await response.json();

  return parseTransactions(data);
}