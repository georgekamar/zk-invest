import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import Utxo from '../lib/utxo';
import { transaction } from '../lib';

import DotsComponent from './dots';

import styles from '../styles/Popups.module.css';

export default function DepositPopup(props) {

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();

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
    setLoadingMessage('Awaiting token transfer approval');
    try{
      // console.log(props)
      // console.log(parsedTokenAmount)
      const depositUtxo = new Utxo({ amount: parsedTokenAmount, keypair: props?.account?.keypair });

      await props?.tokenSigner.approve(props?.zkInvest.address, parsedTokenAmount);

      setLoadingMessage('Generating proof and awaiting signature');

      await transaction({
        zkInvest: props?.signer,
        inputs: [],
        outputs: [depositUtxo]
      })
      props?.hidePopup();
      window.location.reload();
    }catch(error){
      console.log(error)
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
  }

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' disabled={loading} style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color='#444'>Make A Deposit</Typography>
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
          onClick={handleSubmitDeposit}
        >
          Deposit
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
