import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Contract, providers, utils } from 'ethers';
import detectEthereumProvider from "@metamask/detect-provider"


import { Keypair } from '../lib/keypair';


import RegistrationPopup from '../components/registrationPopup';
import InputPrivateKeyPopup from '../components/inputPrivateKeyPopup';

import { Button, Typography } from '@mui/material';

import styles from '../styles/Home.module.css'


import ZkInvestContract from '../contracts/ZkInvest.sol/ZkInvest.json';
import OwnableERC1155Contract from '../contracts/tokens/OwnableERC1155.sol/OwnableERC1155.json';

export default function Home() {

  // const [rpcProvider, setRpcProvider] = useState(new providers.JsonRpcProvider("http://localhost:8545"));
  const [zkInvest, setZkInvest] = useState(null);
  // const zkInvest = new Contract("0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d", ZkInvestContract.abi, provider)
  const [abiCoder, setAbiCoder] = useState(new utils.AbiCoder());

  const [metamaskProvider, setMetamaskProvider] = useState(null);
  const [ethersProvider, setEthersProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState(null);
  const [chainId, setChainId] = useState(null);   // 5 for Goerli

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(null);
  const [account, setAccount] = useState(null);

  const [accountConnectWaiting, setAccountConnectWaiting] = useState(false);
  const [accountRegistrationLoading, setAccountRegistrationLoading] = useState(false);
  const [accountRegistrationClicked, setAccountRegistrationClicked] = useState(false);
  const [accountRegistrationConfirmationPromise, setAccountRegistrationConfirmationPromise] = useState(null);
  const [localPrivateKeyNotFound, setLocalPrivateKeyNotFound] = useState(false);

  const [accountInformationLoading, setAccountInformationLoading] = useState(false);

  // const [shieldedAddress, setShieldedAddress] = useState();
  const [shieldedBalance, setShieldedBalance] = useState();
  const [shieldedProjectTokenBalances, setShieldedProjectTokenBalances] = useState();

  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(null);
  const [projects, setProjects] = useState();


  const loadProjects = () => {

    let projectsFilter = zkInvest.filters.NewProjectCreated();
    zkInvest.queryFilter(projectsFilter)
    .then((events) => {
      setProjects(events);
    })
    .catch((error) => {
      setProjectsError('There was an error loading existing projects');
    })
    .finally(() => {
      setProjectsLoading(false);
    })

  }



  const handleAccountsChanged = async (accounts) => {

    setAccountConnectWaiting(false);
    if(accounts?.[0]){

      setAccount({address: accounts[0]});
      setAccountRegistrationLoading(true);
      let registeredFilter = zkInvest.filters.PublicKey(accounts[0]);
      zkInvest.queryFilter(registeredFilter)
      .then((events) => {
        if(events.length){
          if(localStorage.getItem(accounts[0])){
            setAccount({
              isRegistered: true,
              address: accounts[0],
              keypair: new Keypair()
            });
          }else{
            setLocalPrivateKeyNotFound(true);
          }
        }
      })
      .catch((error) => {
        setAccountError('An error occured loading your account registration status');
      })
      .finally(() => {
        setAccountRegistrationLoading(false);
      });

    }

  }

  const handleConnect = () => {
    if(metamaskProvider){
      setAccountConnectWaiting(true);
      metamaskProvider.request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
    }else{
      setProviderError('Cannot find provider, try reloading the page');
    }
  }

  const handleProviderDisconnected = () => {
    setProviderError('Provider disconnected, please check your connection and reload the page');
  }

  const handleChainChanged = (chainId) => {
    window.location.reload();
  }

  const handleRegistrationConfirmation = async () => {
    setAccountRegistrationClicked(false);
    try{
      if(!account.address){
        throw 'error';
      }
      localStorage.setItem(account.address, account?.keypair?.privkey);
      await signer.register(
        {
          owner: account?.address,
          publicKey: account?.keypair?.address()
        }
      );
      setAccount({
        ...account,
        isRegistered: true
      })
    }catch(e){
      console.log(e)
      setAccountError('There was an error during the registration process, please reload the page and try again');
    }
  }

  const handleSubmitPrivateKey = (privInput) => {
    let keypair;
    try {
      keypair = new Keypair(privInput);
    }catch(e){
      setError('Private Key Not Valid');
    }finally{
      try{
        localStorage.setInput(account.address, privInput);
        setAccount({
          ...account,
          keypair
        });
        setLocalPrivateKeyNotFound(false);
      }catch(e){
        window.location.reload();
      }
    }
  }

  const handleRegistration = async () => {
    setAccountRegistrationClicked(true);
    const newKeypair = new Keypair();
    setAccount({
      ...account,
      keypair: newKeypair
    });
  }

  useEffect(() => {
    if(zkInvest){
      zkInvest.on("NewProjectCreated", (newProjectEvent) => {
        console.log("New Project Created")
        const newProject = utils.AbiCoder.decode([ "bytes creatorPubkey", "uint256 tokenId", "string title", "string description" ], newProjectEvent);
        console.log(newProject);
        setProjects([newProject, ...(projects?.length ? [projects] : [])]);
      })
    }
  }, [zkInvest])


  useEffect(() => {
    if(ethersProvider){
      const zkInvestTemp = new Contract("0x807BEbD7A677b089e7d0dbd554AC93E92a2A8291", ZkInvestContract.abi, ethersProvider);
      setZkInvest(zkInvestTemp);
      setSigner(zkInvestTemp.connect(ethersProvider.getSigner()));
    }
  }, [ethersProvider])

  useEffect(() => {

    if(account?.isRegistered){

      setAccountInformationLoading(true);

      let commitmentsFilter = zkInvest.filters.NewCommitment();
      let pendingCommitmentsFilter = zkInvest.filters.NewPendingCommitment();

      Promise.all([
        zkInvest.queryFilter(commitmentsFilter),
        zkInvest.queryFilter(pendingCommitmentsFilter)
      ])
      .then(([commitmentEvents, pendingCommitmentEvents]) => {

      })
      .catch((error) => {

      })
      .finally(() => {
        setAccountInformationLoading(false);
      })

    }

  }, [account]);


  useEffect(() => {

    (async () => {

      try{

        const provider = await detectEthereumProvider();

        if(provider){
          // From now on, this should always be true:
          // provider === window.ethereum
          if(provider !== window.ethereum){
            setProviderError('Multiple wallets installed');
            setProviderLoading(false);
          }else{
            const chainId = await provider.request({ method: 'eth_chainId' });
            if(chainId !== '0x5' && chainId !== '0x7a69'){    // Goerli chain
              setProviderError('Current chain not supported, please switch to Goerli Network');
            }
            provider.on('accountsChanged', handleAccountsChanged);
            provider.on('chainChanged', handleChainChanged);
            provider.on('disconnect', handleProviderDisconnected);
            setMetamaskProvider(provider);
            const ethersProviderTemp = new providers.Web3Provider(provider);
            setEthersProvider(ethersProviderTemp);
            setProviderLoading(false);
            loadProjects();
          }
        }else{
          setProviderError('MetaMask is not installed');
          setProviderLoading(false);
        }

      }catch(error){

      }

    })();

    // return () => {
    //   console.log('Removing listeners')
    //   zkInvest.removeAllListeners();
    //   metamaskProvider?.removeListener('accountsChanged', handleAccountsChanged);
    //   metamaskProvider?.removeListener('chainChanged', handleChainChanged);
    // }

  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>ZK Invest</title>
        <meta name="description" content="ZK Invest - An Anyonmous Decentralized Investment Platform" />
      </Head>
      {
        accountRegistrationClicked &&
        <RegistrationPopup privateKey={account?.keypair?.privkey} handleConfirmation={handleRegistrationConfirmation} />
      }
      {
        localPrivateKeyNotFound &&
        <InputPrivateKeyPopup handleSubmitPrivateKey={handleSubmitPrivateKey} />
      }
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {
            (
              providerLoading ||
              accountLoading ||
              accountRegistrationLoading ||
              accountInformationLoading
            ) ?
            <Typography>Loading ...</Typography> :
            (
              (
                providerError ||
                accountError
              ) ?
              <Typography color='error'>{providerError || accountError}</Typography> :
              (
                account ?
                (
                  account?.isRegistered ?
                  <div style={{ width:'100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Typography>
                      Shielded Address: <span style={{cursor: 'pointer'}} onClick={account?.keypair?.address() ? (() => navigator.clipboard.writeText(account?.keypair?.address())) : ()=>{}}>
                        {account?.keypair?.address() ? (account?.keypair?.address()?.slice(0, 7) + '...' + account?.keypair?.address()?.slice(124)) : '0x0'}
                      </span>
                    </Typography>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                      <Typography>
                        Shielded Balance: {shieldedBalance || '0'} WETH
                      </Typography>
                      <Button
                        variant='contained'
                        size='small'
                      >
                        Withdraw
                      </Button>
                    </div>
                  </div>
                  :
                  <Button
                    variant='contained'
                    size='small'
                    disabled={accountRegistrationClicked}
                    onClick={handleRegistration}
                    style={{marginLeft: 'auto'}}
                  >
                    Register
                  </Button>
                ) :
                <Button
                  variant='contained'
                  size='small'
                  disabled={accountConnectWaiting}
                  onClick={handleConnect}
                  style={{marginLeft: 'auto'}}
                >
                  Connect
                </Button>
              )
            )
          }
        </div>
      </header>

      <main className={styles.main}>
        <h1>ZK Invest</h1>
        <h2>An Anonymous Decentralized Investment Platform Based on Zero-Knowledge</h2>

        {
          (
            providerLoading
          ) ?
          <Typography>Loading Provider...</Typography> :
          (
            providerError ?
            <Typography color='error'>{providerError}</Typography> :
            <div className={styles.grid} style={{width: '100%'}}>
              {
                (
                  accountLoading ||
                  accountRegistrationLoading ||
                  accountInformationLoading
                ) ?
                <Typography>Loading Acccount ...</Typography> :
                (
                  accountError ?
                  <Typography color='error'>{accountError}</Typography> :
                  (
                    account ?
                    (
                      account?.isRegistered ?
                      <div style={{width: '50%', backgroundColor: '#AAA'}}>
                        <div style={{display: 'flex', flexDirection: 'row'}}>
                          <p style={{width: '50%'}}>Deposit</p>
                          <p style={{width: '50%'}}>Invest</p>
                        </div>
                        <div style={{backgroundColor: '#CCC'}}>
                          Account Content
                        </div>
                      </div> :
                      <Typography>No account registered yet</Typography>
                    ) :
                    <Typography>Please connect your account</Typography>
                  )
                )
              }
              <div style={{width: '50%', backgroundColor: '#EEE'}}>
                <div style={{display: 'flex', flexDirection: 'row'}}>
                  <Typography color='#555' style={{textAlign: 'center'}}>Projects</Typography>
                </div>
                <Typography color='#555'>Project Content</Typography>
              </div>
            </div>
          )
        }

      </main>

    </div>
  )
}
