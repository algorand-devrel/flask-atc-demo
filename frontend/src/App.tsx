import { useState } from 'react';
import { PermissionResult, SessionWallet, SignedTxn, allowedWallets} from 'algorand-session-wallet'
import algosdk from 'algosdk';


function App() {
	
  const [sw, setSw] = useState(new SessionWallet("SandNet", undefined))
  const [addrs, setAddrs] = useState(sw.accountList())
  const [connected, setConnected] = useState(sw.connected())


  async function connect(choice: string){
    const w = new SessionWallet("SandNet", undefined, choice)

    if(!await w.connect()) return alert("Couldnt connect")

    setConnected(w.connected())
    setAddrs(w.accountList())
    setSw(w)
  }

  async function disconnect(){
    sw.disconnect()
    setConnected(false)
    setAddrs([])
    setSw(sw)
  }

  async function sign(e: any) {
    //const suggested = await client()

    //const comp = new algosdk.AtomicTransactionComposer()
    //const pay_txn = getPayTxn(suggested, sw.getDefaultAccount())

    //comp.addTransaction({txn:pay_txn, signer:sw.getSigner()})

    //console.log("Sending txn")
    //const result = await comp.execute(client, 2)
    //console.log(result)
  }



  const options = []
  if(!connected){
    for (const [k,v] of Object.entries(allowedWallets)){
      options.push((<button key={k} className='wallet-option' onClick={()=>{connect(k)}}><img src={v.img(false)} alt='branding'></img>{v.displayName()}</button>))
    }
  }else{
    options.push(<button key='disco' onClick={disconnect}>Sign out</button>)
    options.push(<button key='sign' onClick={sign}>Sign a txn</button>)
  }

  const accts =  addrs.map((a)=>{ return (<li key={a}>{a}</li>) })

  return (
    <div id='app' className="App">
      <h4>Accounts: </h4>
      <ul className='acct-list'> {accts} </ul>
      <h4>Options: </h4>
      <div className='actions'>
        {options}
      </div>
    </div>
  );
}

export default App;