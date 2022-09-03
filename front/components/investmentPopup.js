import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import { Keypair } from '../lib/keypair';
import Utxo from '../lib/utxo';
import { transaction, transactionWithProject } from '../lib';
import { utxosToNullify } from '../lib/utils';

import styles from '../styles/Popups.module.css';

export default function InvestmentPopup(props) {

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);

  const [tokenAmount, setTokenAmount] = useState();


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

        await transaction({
          zkInvest: props?.signer,
          inputs: toNullify,
          outputs: [exactAmountUtxo, changeUtxo]
        })
        await transactionWithProject({
          zkInvest: props?.signer,
          inputs: [exactAmountUtxo],
          outputs: [investUtxo]
        })

      }
      props?.hidePopup();
    }catch(error){
      console.log(error)
      if(error?.code === 4001){
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
  }

  // console.log(props?.account.keypair)
  // console.log(Keypair.fromString(props?.project?.creator?.publicKey))

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' disabled={loading} style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color='#444'>Invest in {props?.project?.title || 'this project'}</Typography>
        </div>
        <Typography color='error'>{error}</Typography>
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
    </div>
  )
}
