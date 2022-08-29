import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import { Utxo } from '../lib/utxo';
// import { transaction } from '../lib';

import styles from '../styles/Popups.module.css';

export default function DepositPopup(props) {

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [tokenAmount, setTokenAmount] = useState(0);


  const handleSubmitDeposit = async () => {

    let parsedTokenAmount;
    try{
      parsedTokenAmount = utils.parse(tokenAmount);
      if(parsedTokenAmount.lte(BigNumber.from(0)){
        throw 'Error';
      })
    }catch(e){
      setError('Invalid Amount');
    }

    setLoading(true);
    try{
      const depositUtxo = new Utxo({ amount: bobDepositAmount, keypair: props?.account?.keypair });
      // await transaction({
      //   zkInvest: props?.signer,
      //   inputs: [],
      //   outputs: [depositUtxo]
      // })
      props?.hidePopup();
    }catch(error){
      setError('There was a problem with your deposit, try reloading the page and retrying');
    }

  }

  const handleTokenAmountChange = (e) => {
    setTokenAmount(e.nativeEvent.text);
  }

  return (

    <div className={styles.popupContainer}>
      <Typography color='error'>{error}</Typography>
      <TextField
        label='Amount'
        onChange={handleTokenAmountChange}
        value={tokenAmount}
      />
      <Button
        variant='contained'
        size='small'
        disabled={!tokenAmount || loading}
        onClick={handleSubmitDeposit}
      >
        Deposit
      </Button>
    </div>

  )
}
