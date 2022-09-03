import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BigNumber, Contract, providers, utils } from 'ethers';
import detectEthereumProvider from "@metamask/detect-provider"

import { Keypair } from '../lib/keypair';
import Utxo from '../lib/utxo';
import { calculateBalances, addBalances, subBalances } from '../lib/utils';

import RegistrationPopup from '../components/registrationPopup';
import InputPrivateKeyPopup from '../components/inputPrivateKeyPopup';
import CreateProjectPopup from '../components/createProjectPopup';
import DepositPopup from '../components/depositPopup';
import WithdrawPopup from '../components/withdrawPopup';
import InvestmentPopup from '../components/investmentPopup';
import PendingOutgoingInvestmentsPopup from '../components/pendingOutgoingInvestmentsPopup';
import PendingIncomingInvestmentsPopup from '../components/pendingIncomingInvestmentsPopup';

import { Button, Typography } from '@mui/material';

import styles from '../styles/Home.module.css'


import ZkInvestContract from '../contracts/ZkInvest.sol/ZkInvest.json';
import OwnableERC1155Contract from '../contracts/tokens/OwnableERC1155.sol/OwnableERC1155.json';
import ZkTokenContract from '../contracts/tokens/ERC20.sol/ERC20.json';

const loadProjects = async (zkInvest, setProjects, setProjectTokens, setProjectsLoading, setProjectsError) => {

  let projectsFilter = zkInvest.filters.NewProjectCreated();
  zkInvest.queryFilter(projectsFilter)
  .then(async (events) => {
    let tempProjects = [];
    let tempTokens = [];
    for(let event of events){
      const tempProject = await zkInvest.projects(event?.args?.tokenId);
      const tempToken = await zkInvest.projectTokens(event?.args?.tokenId);
      tempProjects.push(tempProject);
      tempTokens.push(tempToken);
    }
    tempProjects.sort((a, b) => a.tokenId.sub(b.tokenId));
    tempTokens.sort((a, b) => a.id.sub(b.id))
    setProjects(tempProjects);
    setProjectTokens(tempTokens)
  })
  .catch((error) => {
    setProjectsError('There was an error loading existing projects');
  })
  .finally(() => {
    setProjectsLoading(false);
  })

}

const handleConnect = (metamaskProvider, setAccountConnectWaiting, setProviderError, handleAccountsChanged) => {
  if(metamaskProvider){
    setAccountConnectWaiting(true);
    metamaskProvider.request({ method: 'eth_accounts' })
    .then(handleAccountsChanged)
  }else{
    setProviderError('Cannot find provider, try reloading the page');
  }
}


const handleRegistrationConfirmation = async (signer, account, setAccount, setAccountError, setAccountRegistrationClicked) => {
  setAccountRegistrationClicked(false);
  try{
    if(!account.address){
      throw 'error';
    }
    localStorage.setItem(account.address, account?.keypair?.privkey);
    // await signer.initializeProjects()
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


const handleRegistration = async (account, setAccount, setAccountRegistrationClicked) => {
  setAccountRegistrationClicked(true);
  const newKeypair = new Keypair();
  setAccount({
    ...account,
    keypair: newKeypair
  });
}




export default function Home() {

  // const [rpcProvider, setRpcProvider] = useState(new providers.JsonRpcProvider("http://localhost:8545"));
  const [zkInvest, setZkInvest] = useState(null);
  const [zkInvestToken, setZkInvestToken] = useState(null);
  const [zkInvestProjectsToken, setZkInvestProjectsToken] = useState(null);
  // const zkInvest = new Contract("0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d", ZkInvestContract.abi, provider)
  const [abiCoder, setAbiCoder] = useState(new utils.AbiCoder());

  const [metamaskProvider, setMetamaskProvider] = useState(null);
  const [ethersProvider, setEthersProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tokenSigner, setTokenSigner] = useState(null);

  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState(null);
  const [chainId, setChainId] = useState(null);   // 5 for Goerli

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(null);
  const [account, setAccount] = useState(null);
  const [myProject, setMyProject] = useState(null);

  const [accountConnectWaiting, setAccountConnectWaiting] = useState(false);
  const [accountRegistrationLoading, setAccountRegistrationLoading] = useState(false);
  const [accountRegistrationClicked, setAccountRegistrationClicked] = useState(false);
  const [accountRegistrationConfirmationPromise, setAccountRegistrationConfirmationPromise] = useState(null);
  const [localPrivateKeyNotFound, setLocalPrivateKeyNotFound] = useState(false);

  const [accountInformationLoading, setAccountInformationLoading] = useState(false);

  // const [shieldedAddress, setShieldedAddress] = useState();
  const [validCommitmentUtxos, setValidCommitmentUtxos] = useState();
  const [pendingIncomingCommitmentUtxos, setPendingIncomingCommitmentUtxos] = useState();
  const [pendingCancellableCommitmentUtxos, setPendingCancellableCommitmentUtxos] = useState();
  const [toBeNullifiedCommitmentUtxos, setToBeNullifiedCommitmentUtxos] = useState();
  const [shieldedBalances, setShieldedBalances] = useState();
  const [pendingIncomingBalances, setPendingIncomingBalances] = useState();
  const [pendingOutgoingBalances, setPendingOutgoingBalances] = useState();

  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(null);
  const [projects, setProjects] = useState();
  const [projectTokens, setProjectTokens] = useState();

  const [creatingProject, setCreatingProject] = useState(false);
  const [withdrawingFunds, setWithdrawingFunds] = useState(false);
  const [depositingFunds, setDepositingFunds] = useState(false);
  const [projectInvestingIn, setProjectInvestingIn] = useState(false);

  const [managingPendingOutgoingInvestments, setManagingPendingOutgoingInvestments] = useState(false);
  const [managingPendingIncomingInvestments, setManagingPendingIncomingInvestments] = useState(false);

  const [projectTokenWithdrawal, setProjectTokenWithdrawal] = useState(false);


  const handleProviderDisconnected = () => {
    setProviderError('Provider disconnected, please check your connection and reload the page');
  }

  const handleChainChanged = (chainId) => {
    window.location.reload();
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
            const accountKeyPair = new Keypair(localStorage.getItem(accounts[0]));
            setAccount({
              isRegistered: true,
              address: accounts[0],
              keypair: accountKeyPair
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

  const handleViewMyProjectInvestments = () => {
    setManagingPendingIncomingInvestments(true);
  }

  const handlePendingInvestments = () => {
    setManagingPendingOutgoingInvestments(true);
  }

  const handleInvest = (project) => {
    setProjectInvestingIn(project);
  }

  const handleCreateProject = () => {
    setCreatingProject(true);
  }

  const handleDeposit = () => {
    setDepositingFunds(true);
  }

  const handleWithdrawal = async () => {
    setWithdrawingFunds(true);
  }

  const handleProjectTokenWithdrawal = (tokenId) => {
    setProjectTokenWithdrawal(tokenId);
  }

  useEffect(() => {
    if(account?.isRegistered && projects?.length && !myProject){
      setMyProject((projects || [])?.find(project => project?.creator?.publicKey === account?.keypair?.address()))
    }
  }, [account, projects])


  useEffect(() => {
    if(zkInvest){
      loadProjects(zkInvest, setProjects, setProjectTokens, setProjectsLoading, setProjectsError);
      metamaskProvider.on('accountsChanged', handleAccountsChanged);
      // zkInvest.on("NewProjectCreated", (newProjectEvent) => {
      //   console.log("New Project Created")
      //   const newProject = abiCoder.decode([ "bytes creator", "uint256 tokenId", "string title", "string description" ], newProjectEvent);
      //   console.log(newProject);
      //   // setProjects([newProjectEvent?.args, ...(projects?.length ? [projects] : [])]);
      // })
      // zkInvest.on("NewCommitment", async (newCommitmentEvent) => {
      //   console.log("New Commitment")
      //   console.log(newCommitmentEvent?.args);
      //   try{
      //     let commitmentUtxo = Utxo.decrypt(account?.keypair, newCommitmentEvent.args.encryptedOutput, newCommitmentEvent.args.index);
      //     setValidCommitmentUtxos([validCommitmentUtxos, ...commitmentUtxo]);
      //     setShieldedBalances({
      //       ...shieldedBalances,
      //       [commitmentUtxo.tokenId.toString()]: shieldedBalances[commitmentUtxo].amount.add(commitmentUtxo.amount)
      //     })
      //     let tempPendingCommitmentUtxos = pendingCommitmentUtxos;
      //     pendingCommitmentUtxos.forEach((utxo, i) => {
      //       if(utxo.getCommitment() === newCommitmentEvent.args.commitment){
      //         tempPendingCommitmentUtxos.splice(i, 1);
      //         break;
      //       }
      //     });
      //     if(tempPendingCommitmentUtxos?.length !== pendingCommitmentUtxos?.length){
      //       setPendingCommitmentUtxos(tempPendingCommitmentUtxos);
      //     }
      //   }catch(e){
      //   }
      // })
      // zkInvest.on("NewPendingCommitment", async (newPendingCommitmentEvent) => {
      //   console.log("New Pending Commitment")
      //   console.log(newPendingCommitmentEvent?.args);
      //   try{
      //     let commitmentUtxo = Utxo.decrypt(account?.keypair, newPendingCommitmentEvent.args.encryptedOutput, newPendingCommitmentEvent.args.index);
      //     setPendingCommitmentUtxos([pendingCommitmentUtxos, ...commitmentUtxo]);
      //     setPendingBalances({
      //       ...shieldedBalances,
      //       [commitmentUtxo.tokenId.toString()]: shieldedBalances[commitmentUtxo].amount.add(commitmentUtxo.amount)
      //     })
      //     let tempPendingCommitmentUtxos = pendingCommitmentUtxos;
      //     pendingCommitmentUtxos.forEach((utxo, i) => {
      //       if(utxo.getCommitment() === newCommitmentEvent.args.commitment){
      //         tempPendingCommitmentUtxos.splice(i, 1);
      //         break;
      //       }
      //     });
      //     if(tempPendingCommitmentUtxos?.length !== pendingCommitmentUtxos?.length){
      //       setPendingCommitmentUtxos(tempPendingCommitmentUtxos);
      //     }
      //     // const nullifierHash = commitmentUtxo.getNullifier();
      //     // if(await zkInvest.nullifierHashes(nullifierHash)){
      //     // }else if(await zkInvest.pendingNullifierHashes(nullifierHash)){
      //     //   setToBeNullifiedCommitmentUtxos([toBeNullifiedCommitmentUtxos, ...commitmentUtxo]);
      //     //   setPendingBalances({
      //     //     ...pendingBalances,
      //     //     [commitmentUtxo.tokenId.toString()]: pendingBalances[commitmentUtxo].amount.add(commitmentUtxo.amount)
      //     //   })
      //     //   setShieldedBalances({
      //     //     ...shieldedBalances,
      //     //     [commitmentUtxo.tokenId.toString()]: shieldedBalances[commitmentUtxo].amount.sub(commitmentUtxo.amount)
      //     //   })
      //     // }else{
      //     // }
      //   }catch(e){
      //   }
      //   // setProjects([newProjectEvent?.args, ...(projects?.length ? [projects] : [])]);
      // })
    }
  }, [zkInvest])

  useEffect(() => {
    if(ethersProvider){
      const zkInvestTemp = new Contract(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8FF6660eC2F6785B9895E6eDbe447aa6BF196B4d', ZkInvestContract.abi, ethersProvider);
      const zkInvestTokenTemp = new Contract(process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', ZkTokenContract.abi, ethersProvider)
      setZkInvestToken(zkInvestTokenTemp)
      setZkInvest(zkInvestTemp);
      const zkInvestProjectsTokenTemp = new Contract(process.env.NEXT_PUBLIC_PROJECT_TOKENS_ADDRESS || '0x7c03d0fB2819B3587B3Ba8dAD13232EB2DfFD59D', OwnableERC1155Contract.abi, ethersProvider)
      setZkInvestProjectsToken(zkInvestProjectsTokenTemp);
      setSigner(zkInvestTemp.connect(ethersProvider.getSigner()));
      setTokenSigner(zkInvestTokenTemp.connect(ethersProvider.getSigner()));
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
      .then(async ([commitmentEvents, pendingCommitmentEvents]) => {

        let tempValidCommitmentUtxos = [];
        let tempToBeNullifiedCommitmentUtxos = [];
        let tempPendingIncomingCommitmentUtxos = [];
        let tempPendingCancellableCommitmentUtxos = [];

        for(let event of commitmentEvents){
          try{
            let commitmentUtxo = Utxo.decrypt(account?.keypair, event.args.encryptedOutput, event.args.index);
            let isNullified = false;
            let willBeNullified = false;
            try{
              const nullifierHash = commitmentUtxo.getNullifier();
              isNullified = await zkInvest.nullifierHashes(nullifierHash);
              willBeNullified = await zkInvest.pendingNullifierHashes(nullifierHash);
              if(isNullified && !willBeNullified){
              }else if(willBeNullified){
                tempToBeNullifiedCommitmentUtxos.push(commitmentUtxo);
              }else{
                tempValidCommitmentUtxos.push(commitmentUtxo);
              }
            }catch(e){
              if(!isNullified && !willBeNullified){
                tempValidCommitmentUtxos.push(commitmentUtxo);
              }
            }
          }catch(e2){
          }
        }
        for(let event of pendingCommitmentEvents){
          try{
            // console.log(event)
            let pendingCommitmentUtxo = Utxo.decrypt(account?.keypair, event.args.encryptedOutput, event.args.index);
            // Make sure commitment still pending
            const pendingSisterCommitmentUtxo = await zkInvest.pendingCommitmentToCommitment(pendingCommitmentUtxo.getCommitment());

            if(!BigNumber.from(0).eq(pendingSisterCommitmentUtxo)){
              let willBeNullified = false;
              try{
                willBeNullified = await zkInvest.pendingNullifierHashes(pendingCommitmentUtxo.getNullifier());
                if(willBeNullified){
                  tempToBeNullifiedCommitmentUtxos.push(pendingCommitmentUtxo);
                }
              }catch(e){
              }finally{
                if(willBeNullified){
                }else if(pendingCommitmentUtxo.destPubAddress){
                  tempPendingCancellableCommitmentUtxos.push(pendingCommitmentUtxo);
                }else{
                  tempPendingIncomingCommitmentUtxos.push(pendingCommitmentUtxo);
                }
              }
            }
          }catch(e2){
          }
        }

        setValidCommitmentUtxos(tempValidCommitmentUtxos);
        setToBeNullifiedCommitmentUtxos(tempToBeNullifiedCommitmentUtxos);
        setPendingCancellableCommitmentUtxos(tempPendingCancellableCommitmentUtxos);
        setPendingIncomingCommitmentUtxos(tempPendingIncomingCommitmentUtxos);

        let tempOutgoingBalances = calculateBalances(tempPendingCancellableCommitmentUtxos);
        let tempShieldedBalances = subBalances(addBalances(calculateBalances(tempValidCommitmentUtxos), calculateBalances(tempToBeNullifiedCommitmentUtxos)), tempOutgoingBalances);

        setPendingIncomingBalances(calculateBalances(tempPendingIncomingCommitmentUtxos));
        setPendingOutgoingBalances(tempOutgoingBalances);
        setShieldedBalances(tempShieldedBalances);

      })
      .catch((error) => {

      })
      .finally(() => {
        setAccountInformationLoading(false);
      })

    }

  }, [account]);

  // console.log(shieldedBalances)

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
            //process.env.NEXT_PUBLIC_ALLOW_LOCAL_CHAIN != 'Y' &&
            if(chainId !== '0x5' && ((process.env.NEXT_PUBLIC_ALLOW_LOCAL_CHAIN != 'Y') || (process.env.NEXT_PUBLIC_ALLOW_LOCAL_CHAIN == 'Y' && chainId !== '0x7a69'))){    // Goerli chain
              setProviderError('Current chain not supported, please switch to Goerli Network');
            }
            setMetamaskProvider(provider);
            const ethersProviderTemp = new providers.Web3Provider(provider);
            setEthersProvider(ethersProviderTemp);
            setProviderLoading(false);
            provider.on('chainChanged', handleChainChanged);
            provider.on('disconnect', handleProviderDisconnected);
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
        <RegistrationPopup privateKey={account?.keypair?.privkey} handleConfirmation={() => handleRegistrationConfirmation(signer, account, setAccount, setAccountError, setAccountRegistrationClicked)} />
      }
      {
        localPrivateKeyNotFound &&
        <InputPrivateKeyPopup account={account} setAccount={setAccount} setLocalPrivateKeyNotFound={setLocalPrivateKeyNotFound} />
      }
      {
        creatingProject &&
        <CreateProjectPopup
          account={account}
          signer={signer}
          hidePopup={() => setCreatingProject(false)}
        />
      }
      {
        depositingFunds &&
        <DepositPopup
          account={account}
          signer={signer}
          tokenSigner={tokenSigner}
          zkInvest={zkInvest}
          hidePopup={() => setDepositingFunds(false)}
        />
      }
      {
        withdrawingFunds &&
        <WithdrawPopup
          account={account}
          signer={signer}
          tokenId={0}
          shieldedBalance={shieldedBalances?.[0] || 0}
          inputs={validCommitmentUtxos?.filter(utxo => utxo?.tokenId == 0) || []}
          hidePopup={() => setWithdrawingFunds(false)}
        />
      }
      {
        (projectTokenWithdrawal !== false) &&
        <WithdrawPopup
          account={account}
          signer={signer}
          tokenId={projectTokenWithdrawal}
          shieldedBalance={shieldedBalances?.[projectTokenWithdrawal] || 0}
          inputs={validCommitmentUtxos?.filter(utxo => utxo?.tokenId == projectTokenWithdrawal) || []}
          hidePopup={() => setProjectTokenWithdrawal(false)}
        />
      }
      {
        (projectInvestingIn !== false) &&
        <InvestmentPopup
          account={account}
          signer={signer}
          project={projectInvestingIn}
          projectToken={projectTokens?.find(token => token?.id.eq(projectInvestingIn?.tokenId))}
          shieldedBalance={shieldedBalances?.[0] || 0}
          inputs={validCommitmentUtxos?.filter(utxo => utxo?.tokenId == 0) || []}
          hidePopup={() => setProjectInvestingIn(false)}
        />
      }
      {
        managingPendingOutgoingInvestments &&
        <PendingOutgoingInvestmentsPopup
          // account={account}
          signer={signer}
          projects={projects}
          pendingCancellableCommitmentUtxos={pendingCancellableCommitmentUtxos}
          hidePopup={() => setManagingPendingOutgoingInvestments(false)}
        />
      }
      {
        managingPendingIncomingInvestments &&
        <PendingIncomingInvestmentsPopup
          account={account}
          signer={signer}
          projectToken={projectTokens?.find(tok => tok?.id.eq(BigNumber.from(myProject?.tokenId)))}
          pendingIncomingCommitmentUtxos={pendingIncomingCommitmentUtxos}
          hidePopup={() => setManagingPendingIncomingInvestments(false)}
        />
      }
      <div className={styles.innerContainer}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            {
              (
                providerLoading ||
                accountLoading ||
                accountRegistrationLoading ||
                accountInformationLoading
              ) ?
              <Typography
                style={{marginLeft: 'auto'}}
              >
                Loading {accountInformationLoading && 'Balances'}...
              </Typography> :
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
                          {account?.keypair?.address() ? (account?.keypair?.address()?.slice(0, 7) + '...' + account?.keypair?.address()?.slice(124)) : '0x0'} <span style={{color: '#22CCEE'}}>(copy)</span>
                        </span>
                      </Typography>
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <Typography>
                          Shielded Balance: {utils.formatEther(shieldedBalances?.[0] || 0)} WETH
                        </Typography>
                        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                          <Button
                            variant='contained'
                            size='small'
                            onClick={handleDeposit}
                          >
                            Deposit
                          </Button>
                          <Button
                            variant='contained'
                            size='small'
                            style={{marginLeft: 5}}
                            onClick={handleWithdrawal}
                          >
                            Withdraw
                          </Button>
                        </div>
                      </div>
                    </div>
                    :
                    <Button
                      variant='contained'
                      size='small'
                      disabled={accountRegistrationClicked}
                      onClick={() => handleRegistration(account, setAccount, setAccountRegistrationClicked)}
                      style={{marginLeft: 'auto'}}
                    >
                      Register
                    </Button>
                  ) :
                  <Button
                    variant='contained'
                    size='small'
                    disabled={accountConnectWaiting}
                    onClick={() => handleConnect(metamaskProvider, setAccountConnectWaiting, setProviderError, handleAccountsChanged)}
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
                    <div style={{width: '50%', backgroundColor: '#AAA'}}>
                      <div style={{display: 'flex', flexDirection: 'row'}}>
                        <Typography>Investments</Typography>
                      </div>
                      {
                        account ?
                        (
                          account?.isRegistered ?
                          (
                            (
                              (Object.keys(shieldedBalances || {})?.length > 1) ||
                              (pendingCancellableCommitmentUtxos?.length > 0)
                            ) ?
                            <div style={{backgroundColor: '#CCC'}}>
                              {
                                (pendingCancellableCommitmentUtxos?.length > 0) &&
                                <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                                  <Typography>Pending: {utils.formatEther(pendingOutgoingBalances?.[0])} WETH</Typography>
                                  <Button
                                    variant='contained'
                                    size='small'
                                    onClick={handlePendingInvestments}
                                  >
                                    View
                                  </Button>
                                </div>
                              }
                              {
                                (Object.keys(shieldedBalances || {})?.length > 1) &&
                                <div>
                                  <Typography>Confirmed</Typography>
                                  {
                                    Object.keys(shieldedBalances || {})?.map((tokenId) => {
                                      if(tokenId != 0){
                                        const project = projects?.find(pr => pr?.tokenId.eq(BigNumber.from(tokenId)));
                                        return (
                                          <div key={tokenId} style={{backgroundColor: '#999', borderRadius: 10, margin: 5, padding: 5}}>
                                            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                                              <div>
                                                {/* <Typography><b>Your Project</b></Typography> */}
                                                <Typography>{project?.title}</Typography>
                                                <Typography>{projects?.description}</Typography>
                                                <Typography>Token Value: {utils.formatEther(projectTokens?.find(tok => tok?.id.eq(BigNumber.from(tokenId)))?.value)}</Typography>
                                                <Typography>Balance: {shieldedBalances[tokenId]?.toString()}</Typography>
                                              </div>
                                              <Button
                                                variant='contained'
                                                size='small'
                                                onClick={() => handleProjectTokenWithdrawal(tokenId)}
                                                style={{marginLeft: 'auto', marginRight: 5}}
                                              >
                                                Withdraw
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      }
                                    })
                                  }
                                </div>
                              }
                            </div> :
                            <Typography>You have not invested in any project yet</Typography>
                          ) :
                          <Typography>No account registered yet</Typography>
                        ) :
                        <Typography>Please connect your account</Typography>
                      }
                    </div>
                  )
                }

                <div style={{width: '50%', backgroundColor: '#EEE'}}>
                  <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                    <Typography color='#555' style={{textAlign: 'center'}}>Projects</Typography>
                    {
                      account?.isRegistered &&
                      !myProject &&
                      <Button
                        variant='contained'
                        size='small'
                        onClick={handleCreateProject}
                        style={{marginLeft: 'auto', marginRight: 5}}
                      >
                        Create Project
                      </Button>
                    }
                  </div>
                  {
                    projectsLoading ?
                    <Typography color='#555'>Loading Projects</Typography> :
                    (
                      projectsError ?
                      <Typography color='error'>{projectsError}</Typography> :
                      <div>
                        {
                          myProject &&
                          projectTokens?.length &&
                          <div style={{backgroundColor: '#2299ee', borderRadius: 10, margin: 5, padding: 5}}>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                              <Typography><b>Your Project</b></Typography>
                              <Typography>{myProject?.title}</Typography>
                              <Typography>{myProject?.description}</Typography>
                              <Typography>Token Value: {utils.formatEther(projectTokens?.find(tok => tok?.id.eq(myProject?.tokenId))?.value)}</Typography>
                              <Button
                                variant='contained'
                                size='small'
                                color='warning'
                                onClick={handleViewMyProjectInvestments}
                                style={{alignSelf: 'center'}}
                              >
                                View Investments
                              </Button>
                              {/* <Button
                                variant='contained'
                                size='small'
                                color='warning'
                                onClick={() => handleInvest(myProject)}
                                style={{marginLeft: 'auto', marginRight: 5}}
                              >
                                Invest
                              </Button> */}
                            </div>
                          </div>
                        }
                        {
                          projects.map((project, i) => (
                            (
                              !myProject ||
                              !project.tokenId.eq(myProject?.tokenId)
                            ) &&
                            <div key={i.toString()} style={{backgroundColor: '#999', borderRadius: 10, margin: 5, padding: 5}}>
                              <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                                <div>
                                  {/* <Typography><b>Your Project</b></Typography> */}
                                  <Typography>{project?.title}</Typography>
                                  <Typography>{project?.description}</Typography>
                                  <Typography>Token Value: {utils.formatEther(projectTokens?.find(tok => tok?.id.eq(project?.tokenId))?.value)}</Typography>
                                </div>
                                {
                                  (
                                    !accountLoading &&
                                    !accountRegistrationLoading &&
                                    !accountInformationLoading &&
                                    !accountError &&
                                    account?.isRegistered
                                  ) &&
                                  <Button
                                    variant='contained'
                                    size='small'
                                    onClick={() => handleInvest(project)}
                                    style={{marginLeft: 'auto', marginRight: 5}}
                                  >
                                    Invest
                                  </Button>
                                }
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )
                  }
                </div>
              </div>
            )
          }

        </main>
      </div>

    </div>
  )
}
