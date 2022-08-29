import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Contract, providers, utils } from 'ethers';
import detectEthereumProvider from "@metamask/detect-provider"

import { Keypair } from '../lib/keypair';
import { Utxo } from '../lib/utxo';
import { calculateBalances, addBalances, subBalances } from '../lib/utils';

import RegistrationPopup from '../components/registrationPopup';
import InputPrivateKeyPopup from '../components/inputPrivateKeyPopup';
import CreateProjectPopup from '../components/CreateProjectPopup';
import DepositPopup from '../components/DepositPopup';
import WithdrawPopup from '../components/WithdrawPopup';
import InvestmentPopup from '../components/InvestmentPopup';

import { Button, Typography } from '@mui/material';

import styles from '../styles/Home.module.css'


import ZkInvestContract from '../contracts/ZkInvest.sol/ZkInvest.json';
import OwnableERC1155Contract from '../contracts/tokens/OwnableERC1155.sol/OwnableERC1155.json';

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
  const [myProject, setMyProject] = useState(null);

  const [accountConnectWaiting, setAccountConnectWaiting] = useState(false);
  const [accountRegistrationLoading, setAccountRegistrationLoading] = useState(false);
  const [accountRegistrationClicked, setAccountRegistrationClicked] = useState(false);
  const [accountRegistrationConfirmationPromise, setAccountRegistrationConfirmationPromise] = useState(null);
  const [localPrivateKeyNotFound, setLocalPrivateKeyNotFound] = useState(false);

  const [accountInformationLoading, setAccountInformationLoading] = useState(false);

  // const [shieldedAddress, setShieldedAddress] = useState();
  const [validCommitmentUtxos, setValidCommitmentUtxos] = useState();
  const [pendingCommitmentUtxos, setPendingCommitmentUtxos] = useState();
  const [toBeNullifiedCommitmentUtxos, setToBeNullifiedCommitmentUtxos] = useState();
  const [shieldedBalances, setShieldedBalances] = useState();
  const [pendingBalances, setPendingBalances] = useState();

  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(null);
  const [projects, setProjects] = useState();
  const [projectTokens, setProjectTokens] = useState();

  const [creatingProject, setCreatingProject] = useState(false);
  const [withdrawingFunds, setWithdrawingFunds] = useState(false);
  const [depositingFunds, setDepositingFunds] = useState(false);
  const [projectInvestingIn, setProjectInvestingIn] = useState(false);

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


  const handleInvest = (project) => {
    setProjectInvestingIn(project);
  }

  const handleCreateProject = () => {
    setCreatingProject(true);
  }

  const handleDeposit = () => {
    setDepositingFunds(true);
  }

  const handleWithdrawal = () => {
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
      .then(async ([commitmentEvents, pendingCommitmentEvents]) => {
        let tempValidCommitmentUtxos = [];
        let tempToBeNullifiedCommitmentUtxos = [];
        let tempPendingCommitmentUtxos = [];
        for(let event of commitmentEvents){
          try{
            let commitmentUtxo = Utxo.decrypt(account?.keypair, event.args.encryptedOutput, event.args.index);
            const nullifierHash = commitmentUtxo.getNullifier();
            if(await zkInvest.nullifierHashes(nullifierHash)){
            }else if(await zkInvest.pendingNullifierHashes(nullifierHash)){
              tempToBeNullifiedCommitmentUtxos.push(commitmentUtxo);
            }else{
              tempValidCommitmentUtxos.push(commitmentUtxo);
            }
          }catch(e){
          }
        }
        for(let event of pendingCommitmentEvents){
          try{
            let pendingCommitmentUtxo = Utxo.decrypt(account?.keypair, event.args.encryptedOutput, event.args.index);
            if(await zkInvest.pendingCommitmentToCommitment(pendingCommitmentUtxo.getCommitment())){
              tempPendingCommitmentUtxos.push(pendingCommitmentUtxo);
            }
          }catch(e){
          }
        }

        setValidCommitmentUtxos(tempValidCommitmentUtxos);
        setToBeNullifiedCommitmentUtxos(tempToBeNullifiedCommitmentUtxos);
        setPendingCommitmentUtxos(pendingCommitmentUtxos);

        let tempPendingBalances = subBalances(calculateBalances(tempPendingCommitmentUtxos), calculateBalances(tempToBeNullifiedCommitmentUtxos));
        let tempShieldedBalances = addBalances(calculateBalances(tempValidCommitmentUtxos), tempShieldedBalances);

        setPendingBalances(tempPendingBalances);
        setShieldedBalances(tempShieldedBalances);

      })
      .catch((error) => {

      })
      .finally(() => {
        setAccountInformationLoading(false);
      })

    }

  }, [account]);

  console.log(shieldedBalances)

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
          shieldedBalance={shieldedBalances?.[0] || 0}
          inputs={validCommitmentUtxos?.filter(utxo => utxo?.tokenId == 0) || []}
          hidePopup={() => setProjectInvestingIn(false)}
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
                          Shielded Balance: {shieldedBalances?.[0] || '0'} WETH
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
                            (Object.keys(shieldedBalances || {})?.length > 1) ?
                            <div style={{backgroundColor: '#CCC'}}>
                              {
                                Object.keys(shieldedBalances || {})?.map((tokenId) => (
                                  (tokenId != 0) &&
                                  <div key={i.toString()} style={{backgroundColor: '#999', borderRadius: 10, margin: 5, padding: 5}}>
                                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                                      <div>
                                        {/* <Typography><b>Your Project</b></Typography> */}
                                        <Typography>{project?.title}</Typography>
                                        <Typography>{project?.description}</Typography>
                                        <Typography>Token Value: {utils.formatEther(projectTokens?.find(tok => tok?.id.eq(BigNumber.from(tokenId)))?.value)}</Typography>
                                        <Typography>Balance: {shieldedBalances[tokenId]}</Typography>
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
                                ))
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
                            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                              <div>
                                <Typography><b>Your Project</b></Typography>
                                <Typography>{myProject?.title}</Typography>
                                <Typography>{myProject?.description}</Typography>
                                <Typography>Token Value: {utils.formatEther(projectTokens?.find(tok => tok?.id.eq(myProject?.tokenId))?.value)}</Typography>
                              </div>
                              <Button
                                variant='contained'
                                size='small'
                                color='warning'
                                onClick={() => handleInvest(myProject)}
                                style={{marginLeft: 'auto', marginRight: 5}}
                              >
                                Invest
                              </Button>
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
                                <Button
                                  variant='contained'
                                  size='small'
                                  onClick={() => handleInvest(project)}
                                  style={{marginLeft: 'auto', marginRight: 5}}
                                >
                                  Invest
                                </Button>
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
