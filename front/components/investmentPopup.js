import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import Keypair from '../lib/keypair';
import Utxo from '../lib/utxo';
import { transaction } from '../lib';
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

    setLoading(true);
    try{
      const investUtxo = new Utxo({ amount: parsedTokenAmount, srcPubKey: props?.account?.pubkey, srcEncryptionAddress: props?.account?.keypair?.address(), keypair: Keypair?.fromString(project?.creator?.publicKey) });
      await transaction({
        zkInvest: props?.signer,
        inputs: utxosToNullify(props?.inputs, tokenAmount),
        outputs: [investUtxo]
      })
      setLoading(false);
      props?.hidePopup();
    }catch(error){
      console.log(error)
      setError('There was a problem with your investment, try reloading the page and retrying');
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
        <Typography color='#444'>Invest in {props?.project?.title || 'this project'}</Typography>
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
