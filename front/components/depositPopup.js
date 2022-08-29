import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import Utxo from '../lib/utxo';
import { transaction } from '../lib';

import styles from '../styles/Popups.module.css';

export default function DepositPopup(props) {

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);

  const [tokenAmount, setTokenAmount] = useState();


  const handleSubmitDeposit = async () => {

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

    setLoading(true);
    try{
      // console.log(props)
      // console.log(parsedTokenAmount)
      const depositUtxo = new Utxo({ amount: parsedTokenAmount, keypair: props?.account?.keypair });
      await transaction({
        zkInvest: props?.signer,
        inputs: [],
        outputs: [depositUtxo]
      })
      setLoading(false);
      props?.hidePopup();
    }catch(error){
      console.log(error)
      setError('There was a problem with your deposit, try reloading the page and retrying');
    }

  }

  const handleTokenAmountChange = (e) => {
    setTokenAmount(e.target.value);
  }

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <Button color='error' style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
        <Typography color='error'>{error}</Typography>
        <Typography color='#444'>Make A Deposit</Typography>
        <TextField
          label='Amount (WETH)'
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
    </div>
  )
}
