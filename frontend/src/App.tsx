import { useState } from 'react';
import {  SessionWallet, allowedWallets} from 'algorand-session-wallet'
import algosdk from 'algosdk';
import { algodClient, getPaymentTxnFromServer, constructPaymentTxn } from './lib';


function App() {
  const [sw, setSw] = useState(new SessionWallet("SandNet", undefined))
  const [connected, setConnected] = useState(sw.connected())


  async function connect(choice: string){
    const w = new SessionWallet("SandNet", undefined, choice)
    if(!await w.connect()) return alert("Couldnt connect")

    setConnected(w.connected())
    setSw(w)
  }

  async function disconnect(){
    sw.disconnect()
    setConnected(false)
    setSw(sw)
  }

  const walletOptions = []
  for (const [k,v] of Object.entries(allowedWallets)){
    walletOptions.push((<button key={k} className='wallet-option' onClick={()=>{connect(k)}}><img src={v.img(false)} alt='branding'></img>{v.displayName()}</button>))
  }
  const body = !connected?(<Demo sw={sw}></Demo>):walletOptions;


  return (
    <div id='app' className="App">
      {body}
    </div>
  );
}

type DemoProps = {
  sw: SessionWallet 
}

function Demo(props: DemoProps) {

  const [serverSide, setServerSide] = useState(false)

  const {sw} = props
  const accts = sw.accountList().map((a)=>{ return (<li key={a}>{a}</li>) })

  async function fundAccount() {

  }

  async function getPaymentTxn(): Promise<algosdk.Transaction[]>{
    if(serverSide) return await getPaymentTxnFromServer(sw.getDefaultAccount())
    return await constructPaymentTxn(sw.getDefaultAccount())
  }

  async function getApplicationCreateTxn(): Promise<algosdk.Transaction[]>{
    if(serverSide) return await getApplicationCreateTxnFromServer(sw.getDefaultAccount())
    return await constructApplicationCreateTxn(sw.getDefaultAccount())
  }

  async function getApplicationCallTxn(): Promise<algosdk.Transaction[]>{
    if(serverSide) return await getApplicationCallTxnFromServer(sw.getDefaultAccount())
    return await constructApplicationCallTxn(sw.getDefaultAccount())
  }

  async function signPaymentTxn(txns: algosdk.Transaction[]) {
    //const txns = await get_demo3_txns(sw.getDefaultAccount())
    //const signed = await sw.signTxn(txns)
    //const {txId}  = await algodClient.sendRawTransaction(signed.map((t)=>{return t.blob})).do()
    //const result = await algosdk.waitForConfirmation(algodClient, txId, 3)
    //console.log(result)
  }


  async function handleServerSide(e: any){ setServerSide(e.target.checked) }

  return (
    <div>
      <label>
        Construct transactions serverside
        <input type='checkbox' id='server_side' name='server_side' onChange={handleServerSide}></input>
      </label>
      <h4>Accounts: </h4>
      <ul className='acct-list'> {accts} </ul>
      <h4>Options: </h4>
      <div className='actions'>

      </div>
    </div>
  )


}

export default App;