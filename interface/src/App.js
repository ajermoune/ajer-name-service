import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './styles/App.css';
import { ethers } from 'ethers';
import contractAbi from './utils/contractABI.json';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = '.ajer';
const CONTRACT_ADDRESS = '0xa801FD013141ECF63E08003aC669a495e2269d1A';

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [name, setName] = useState('');
	const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get Metamask -> https://metamask.io/");
				return;
			}

			const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error);
		}
	}

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log("Make sure you have Metamask");
		} else {
			console.log("We have the ethereum object", ethereum);
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}

		const chainId = await ethereum.request({method: 'eth_chainId'});
		setNetwork(networks[chainId]);
		ethereum.on('chainChanged', handleChainChanged);
		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	}

	const mintName = async () => {
		if (!name) {
			return;
		}
		if (name.length < 3) {
			alert('Name must be at least 3 characters long');
			return;
		}
		const price = name.length === 3 ? '0.5' : name.length === 4 ? '0.3' : '0.1';
		console.log('Minting name ', name + '.' + tld, 'with price', price);
		try {
			const {ethereum} = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				console.log('going to pop up wallet now to pay gaz');
				let tx = await contract.register(name, {value: ethers.utils.parseEther(price)});
				const reciept = await tx.wait();
				if (reciept.status === 1) {
					console.log("Domain minted! https//mumbai.polygonscan.com/tx/"+tx.hash);
					tx = await contract.setRecord(name, record);
					await tx.wait();
					console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
					alert(`Your name ${ name + tld} has been minted with record [${ record }]`);
					setTimeout(() => {
						fetchMints();
					}, 2000);
					setName('');
					setRecord('');
				} else {
					alert('Transaction failed please try agin');
				}
			}
		} catch(error) {
			console.log(error);
		}
	}

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{chainId: '0x13881'}]
				});
			} catch (error) {
				if (error.code === 4902) {
					await window.ethereum.request({
						method: 'wallet_addEthereumChain',
						params: [{
							chainId: '0x13881',
							chainName: 'Polygon Mumbai Testnet',
							rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
							nativeCurrency: {
								name: "Mumbai Matic",
								symbol: "MATIC",
								decimals: 18
							},
							blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
						}]
					});
				} else {
					console.log(error);
				}
			}
 		} else {
			alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		}
	}

	const updateRecord = async () => {
		if (!record || !name) {
			return;
		}
		setLoading(true);
		console.log("Updating name", name, "with record", record);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const singer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, singer);

				let tx = await contract.setRecord(name, record);
				await tx.wait();
				console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);
				fetchMints();
				setRecord('');
				setName('');
			}
		} catch (error) {
			console.log(error);
		}
		setLoading(false);
	}

	const fetchMints = async () => {
		try {
			const { ethereum } = window;

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				const names = await contract.getAllNames();

				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log("MINTS FETCHED ", mintRecords);
				setMints(mintRecords);
			}
		} catch (error) {
			console.log(error);
		}
	}

	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);

	const renderNotConnectedContainer = () => {
		return (
			<div className="connect-wallet-container">
				<img src="https://media.giphy.com/media/X2xRGTElqdfry/giphy.gif" alt="here's my wallet gif meme" />
				<button onClick={connectWallet} className="cta-button connect-wallet-button">
					Connect Wallet
				</button>
			</div>
		);
	}

	const renderInputForm = () => {
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<p>Please connect to the Polygon Mumbai Testnet</p>
					<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
				</div>
			);
		}

		return (
			<div className="form-container">
				<div className="first-row">
					<input 
						type="text"
						value={ name }
						placeholder="name"
						onChange={ (e) => setName(e.target.value) }
					/>
					<p className='tld'> { tld } </p>
				</div>
				<input 
					type="text"
					value={ record }
					placeholder="record"
					onChange={ (e) => setRecord(e.target.value)}
				/>
				{editing ? (
					<div className="button-container">
						<button onClick={updateRecord} className='cta-button mint-button' disabled={loading} >
							Set record
						</button>
						<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
							Cancel
						</button>
					</div>
					) : (
					<button className='cta-button mint-button' disabled={loading} onClick={mintName}>
						Mint
					</button> 
				)}
			</div>
		);
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle"> Minted Names</p>
					<div className="mint-list">
						{ mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
									<p> { mint.record } </p>
								</div>
							);
						})}
					</div>
				</div>
			);
		}
	};

	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setName(name);
	}

	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

  	return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
            			<div className="left">
            			  <p className="title">⭐🔖 .AJER Name Service</p>
            			  <p className="subtitle">Your immortal API on the blockchain!</p>
            			</div>
						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>

				{!currentAccount && renderNotConnectedContainer()}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}

       			<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built with @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
