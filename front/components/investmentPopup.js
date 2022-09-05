import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import { Keypair } from '../lib/keypair';
import Utxo from '../lib/utxo';
import { transaction, transactionWithProject } from '../lib';
import { utxosToNullify } from '../lib/utils';

import DotsComponent from './dots';

import styles from '../styles/Popups.module.css';

export default function InvestmentPopup(props) {

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();

  const [tokenAmount, setTokenAmount] = useState();
  const [toBeReceived, setToBeReceived] = useState(BigNumber.from(0));


  const handleSubmitInvestment = async () => {

    let parsedTokenAmount;
    try{
      parsedTokenAmount = utils.parseEther(tokenAmount);
      if(parsedTokenAmount.lte(BigNumber.from(0))){
        throw 'Error';
      }
    }catch(e){
      setError('Invalid Amount');
      return;
    }

    if(!parsedTokenAmount.mod(props?.projectToken?.value).eq(BigNumber.from(0))){
      setError(`Amount invested must be divisible by token value (${utils.formatEther(props?.projectToken?.value)} WETH) to obtain an exact amount of tokens`);
      return;
    }

    let newShieldedBalance = BigNumber.from(props?.shieldedBalance).sub(parsedTokenAmount);
    if(newShieldedBalance.lt(BigNumber.from(0))){
      setError('Insufficient Balance');
      return;
    }

    setLoading(true);
    try{
      const investUtxo = new Utxo({ amount: parsedTokenAmount, srcPubKey: props?.account?.keypair?.pubkey, srcEncryptionAddress: props?.account?.keypair?.address(), keypair: Keypair?.fromString(props?.project?.creator?.publicKey) });

      let exactAmountUtxo = props?.inputs?.find(input => input?.amount?.eq(parsedTokenAmount));

      if(exactAmountUtxo){
        setLoadingMessage('Generating proof and awaiting signature');
        await transactionWithProject({
          zkInvest: props?.signer,
          inputs: [exactAmountUtxo],
          outputs: [investUtxo]
        })
      }else{

        const toNullify = utxosToNullify(props?.inputs, parsedTokenAmount);
        const inputBalance = toNullify?.reduce((acc, el, i) => (acc = acc.add(el.amount)), BigNumber.from(0));

        exactAmountUtxo = new Utxo({ amount: parsedTokenAmount, keypair: props?.account?.keypair });
        const changeUtxo = new Utxo({ amount: inputBalance.sub(parsedTokenAmount), keypair: props?.account?.keypair });

        setLoadingMessage('Generating proof and awaiting commitment breakup transaction signature (1)');

        await transaction({
          zkInvest: props?.signer,
          inputs: toNullify,
          outputs: [exactAmountUtxo, changeUtxo]
        })

        setLoadingMessage('Generating proof and awaiting investment signature (2)');

        await transactionWithProject({
          zkInvest: props?.signer,
          inputs: [exactAmountUtxo],
          outputs: [investUtxo]
        })

      }
      props?.hidePopup();
      window.location.reload();
    }catch(error){
      if(error?.code == 'ACTION_REJECTED'){
        setError('Transaction signature was refused')
      }else{
        setError('There was a problem with your deposit, try reloading the page and retrying');
      }
    }finally{
      setLoading(false);
    }

  }

  const handleTokenAmountChange = (e) => {
    setTokenAmount(e.target.value);
    try{
      setToBeReceived(utils.parseEther(e.target.value).div(props?.projectToken?.value).toString());
    }catch(e){
      setToBeReceived('0');
    }
  }

  // console.log(props?.account.keypair)
  // console.log(Keypair.fromString(props?.project?.creator?.publicKey))

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' disabled={loading} style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color='#444'>Invest in {props?.project?.title || 'this project'}</Typography>
          <Typography color='#444'>Token Value: {utils.formatEther(props?.projectToken?.value)} WETH</Typography>
        </div>
        <Typography color='error'>{error}</Typography>
        {
          tokenAmount ?
          <div>
            <Typography color='#444'>You will receive {toBeReceived} project tokens.</Typography>
            <Typography color='#F80'>This amount should be an exact number that is larger than zero</Typography>
          </div> :
          <Typography color='transparent'>-</Typography>
        }
        <TextField
          label='Amount (WETH)'
          onChange={handleTokenAmountChange}
          value={tokenAmount}
        />
        <Button
          variant='contained'
          size='small'
          disabled={!tokenAmount || loading}
          onClick={handleSubmitInvestment}
        >
          Invest
        </Button>
      </div>
      {
        loading &&
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>
            <Typography>
              {loadingMessage}<DotsComponent />
            </Typography>
          </div>
        </div>
      }
    </div>
  )
}
