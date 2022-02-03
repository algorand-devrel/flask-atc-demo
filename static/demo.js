// Check AlgoSigner is installed.
window.addEventListener('load', function() {
	AlgoSigner.connect().then(() => {
		AlgoSigner.accounts({ledger: 'SandNet'}).then((accs) => {
			document.getElementById('address').value = accs[0].address;
		})
	})
});

// Attach click event to button.
document.addEventListener('DOMContentLoaded', function() {
	const btnDeploy = document.getElementById('deploy_app');
	btnDeploy.addEventListener('click', (e) => {
		e.preventDefault();
		deployerApp();
	});

	const btnFundAlgo = document.getElementById('fund_algo')
	btnFundAlgo.addEventListener('click', (e) => {
		e.preventDefault();
		fundAlgo();
	});

	const btnDemo1 = document.getElementById('demo1');
	btnDemo1.addEventListener('click', (e) => {
		e.preventDefault();
		demo1();
	});

	const btnDemo2 = document.getElementById('demo2');
	btnDemo2.addEventListener('click', (e) => {
		e.preventDefault();
		demo2();
	});
});

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

async function demo1() {
	// Using the data from the form, request new transactions.
	const address = document.getElementById('address').value;
	const data = {
		'sender': address,
		'receiver': address,
		'amount': 1,
	}
	const options = {
		method: 'POST',
		body: JSON.stringify(data),
		headers: {
			'Content-Type': 'application/json'
		}
	}
	const get_txns_response = await fetch('/get_demo1', options);
  const json_response1 = await get_txns_response.json();

	if (json_response1['success']) {
		// Present the user with the transactions to review and sign.
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

async function demo2() {
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
