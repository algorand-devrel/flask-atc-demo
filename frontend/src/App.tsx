import { useState } from "react";
import { SessionWallet, allowedWallets, SignedTxn } from "algorand-session-wallet";
import algosdk from "algosdk";
import {
  algodClient,
  constructPaymentTxn,
  constructApplicationCreateTxn,
  constructApplicationCallComposer,
  getPaymentTxnFromServer,
  getApplicationCallFromServer,
  triggerApplicationCreate,
  sendWait,
  download_txns,
} from "./lib";

function App() {
  const [sw, setSw] = useState(new SessionWallet("SandNet", undefined));
  const [connected, setConnected] = useState(sw.connected());

  async function connect(choice: string) {
    const w = new SessionWallet("SandNet", undefined, choice);
    if (!(await w.connect())) return alert("Couldnt connect");

    setConnected(w.connected());
    setSw(w);
  }

  const walletOptions = [];
  for (const [k, v] of Object.entries(allowedWallets)) {
    walletOptions.push(
      <button
        key={k}
        className="wallet-option"
        onClick={() => { connect(k); }}
      >
        <img src={v.img(false)} alt="branding"></img>
        {v.displayName()}
      </button>
    );
  }
  const body = connected ? <Demo sw={sw}></Demo> : walletOptions;

  return (
    <div id="app" className="App">
      {body}
    </div>
  );
}

type DemoProps = {
  sw: SessionWallet;
};

function Demo(props: DemoProps) {
  const [serverSide, setServerSide] = useState(false);
  const [appId, setAppId] = useState(0);

  const { sw } = props;
  const accts = sw.accountList().map((a) => {
    return <li key={a}>{a}</li>;
  });

  async function fundAccount() {
    const result = await fetch("/fund_algo", {
      method: "POST",
      body: JSON.stringify({ receiver: sw.getDefaultAccount() }),
    });
    const data = await result.json();
    alert(data.message);
  }

  async function doPayment() {
    const ptxn = serverSide
      ? await getPaymentTxnFromServer(
          sw.getDefaultAccount(),
          sw.getDefaultAccount(),
          1
        )
      : await constructPaymentTxn(
          sw.getDefaultAccount(),
          sw.getDefaultAccount(),
          1
        );

    console.log("Got pay txn: ", ptxn);
    const signed = await sw.signTxn(ptxn);
    console.log("Signed transactions: ", signed);
    const result = await sendWait(signed);
    console.log("Result: ", result);
  }

  async function doApplicationCreate() {
    if(serverSide){
      setAppId(await triggerApplicationCreate())
      return
    }

    const acTxn = await constructApplicationCreateTxn(sw.getDefaultAccount());
    console.log("Got app create txn: ", acTxn);

    const signed = await sw.signTxn(acTxn);
    console.log("Signed transactions: ", signed);

    const result = await sendWait(signed);
    const appId = result["application-index"];
    setAppId(appId);

    alert("Created App ID: " + appId);
  }

  async function doApplicationCall() {
    // If we're getting it from the server, just sign it and send it
    if (serverSide) {
      const txns = await getApplicationCallFromServer(
        appId,
        sw.getDefaultAccount()
      );
      const signed = await sw.signTxn(txns);
      const result = await sendWait(signed);
      console.log("Result: ", result);
      return;
    }

    // Otherwise we construct from ATC
    const atc = await constructApplicationCallComposer(appId, sw);
    const result = await atc.execute(algodClient, 3);
    console.log(result);
  }

  async function handleServerSide(e: any) {
    setServerSide(e.target.checked);
  }

  return (
    <div>
      <label>
        Construct transactions serverside
        <input
          type="checkbox"
          id="server_side"
          name="server_side"
          onChange={handleServerSide}
        ></input>
      </label>
      <h4>Accounts: </h4>
      <ul className="acct-list"> {accts} </ul>
      <div className="actions">
        <button onClick={fundAccount}>Fund me plz</button>
        <button onClick={doPayment}>Payment Transaction</button>
        <button onClick={doApplicationCreate}>Application Create</button>
        <button onClick={doApplicationCall}>Application call</button>
      </div>
    </div>
  );
}

export default App;
