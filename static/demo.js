// Attach click event to button.
document.addEventListener('DOMContentLoaded', function() {
	console.log(0);
	const btnRequest = document.getElementById('request_transaction');
	btnRequest.addEventListener('click', (e) => {
		e.preventDefault();
		requestTransaction();
	})

	const btnDeploy = document.getElementById('deploy');
	btnDeploy.addEventListener('click', deployApp);

	const btnFundAlgo = document.getElementById('fund_algo')
	btnFundAlgo.addEventListener('click', (e) => {
		e.preventDefault();
		fundAlgo();
	});
});

document.addEventListener('load', function() {
	console.log(1);
	AlgoSigner.connect().then(() => {
		console.log(2);
		AlgoSigner.accounts({ledger: 'SandNet'}).then((accs) => {
			console.log(3);
			console.log(accs);
			document.getElementById('address').value = accounts[0].address;
		})
	})
});

(async function() {
	await AlgoSigner.connect();
	const accounts = await AlgoSigner.accounts({ledger: 'SandNet'});
	document.getElementById('address').value = accounts[0].address;
})();

async function deployApp() {
	await fetch('/deploy_app', {method: 'POST'})
}

async function fundAlgo() {
	const options = {
		method: 'POST',
		body: JSON.stringify({'receiver': document.getElementById('address').value}),
		headers: {
			'Content-Type': 'application/json'
		}
	}
	await fetch('/fund_algo', options);
}

async function requestTransaction() {
	// Using the data from the form, request new transactions.
	const sender = document.getElementById('address').value;
	const data = {
		'sender': sender,
	}
	const options = {
		method: 'POST',
		body: JSON.stringify(data),
		headers: {
			'Content-Type': 'application/json'
		}
	}
	const get_txns_response = await fetch('/get_demo2', options);
  const json_response1 = await get_txns_response.json();

	if (json_response1['success']) {
		// Present the user with the transactions to review and sign.
		console.log('asdf');
		const stxgroup = await AlgoSigner.signTxn(json_response1['data']);

		// Submit the signed transactions back to the server.
		const signed_data = {
			method: 'POST',
			body: JSON.stringify(stxgroup),
			headers: {
				'Content-Type': 'application/json'
			}
		}
		const send_txns_response = await fetch('/submit', signed_data);
		const json_response2 = await send_txns_response.json();

		if (json_response2['success']) {
			displayMessage(json_response2['message']);
		} else {
			displayMessage(json_response2['message']);
		}
	} else {
		displayMessage(json_response1['message']);
	}
}

function displayMessage(m) {
	alert(m);
}
