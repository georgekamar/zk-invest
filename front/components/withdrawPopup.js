import { useState } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
import Utxo from '../lib/utxo';
import { utxosToNullify } from '../lib/utils';
import { transaction } from '../lib';

import DotsComponent from './dots';

import styles from '../styles/Popups.module.css';

export default function WithdrawalPopup(props) {

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();

  const [tokenAmount, setTokenAmount] = useState();
  const [withdrawAddress, setWithdrawAddress] = useState();

  const handleSubmitWithdrawal = async () => {

    let parsedTokenAmount;
    try{
      parsedTokenAmount = BigNumber.from(props?.tokenId).eq(0) ? utils.parseEther(tokenAmount) : BigNumber.from(tokenAmount);
      if(parsedTokenAmount.lte(BigNumber.from(0))){
        throw 'Error';
      }
    }catch(e){
      console.log(e)
      setError('Invalid Amount');
      return;
    }

    try{
      utils.isAddress(withdrawAddress)
    }catch(e){
      setError('Invalid ETH Address');
      return;
    }

    let newShieldedBalance = BigNumber.from(props?.shieldedBalance).sub(parsedTokenAmount);
    if(newShieldedBalance.lt(BigNumber.from(0))){
      setError('Insufficient Balance');
      return;
    }

    setLoading(true);
    try{
      const withdrawOutputUtxo = new Utxo({ tokenId: props?.tokenId, amount: newShieldedBalance, keypair: props?.account?.keypair });
      setLoadingMessage('Generating proof and awaiting signature');
      await transaction({
        zkInvest: props?.signer,
        inputs: utxosToNullify(props?.inputs, parsedTokenAmount),
        outputs: [withdrawOutputUtxo],
        recipient: withdrawAddress
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

  const handleAddressChange = (e) => {
    setWithdrawAddress(e.target.value);
  }

  const handleTokenAmountChange = (e) => {
    setTokenAmount(e.target.value);
  }

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' disabled={loading} style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color='#444'>Withdraw Funds</Typography>
          <Typography color='#444'>Your balance: {props?.tokenId == 0 ? utils.formatEther(props?.shieldedBalance) : props?.shieldedBalance?.toString()} {props?.tokenId == 0 ? '(WETH)': 'tokens'}</Typography>
        </div>
        <Typography color='error'>{error}</Typography>
        <TextField
          label={`Amount ${props?.tokenId == 0 ? '(WETH)': ''}`}
          onChange={handleTokenAmountChange}
          value={tokenAmount}
        />
        <TextField
          label='Withdrawal Address'
          onChange={handleAddressChange}
          value={withdrawAddress}
        />
        <Button
          variant='contained'
          size='small'
          disabled={!tokenAmount || loading}
          onClick={handleSubmitWithdrawal}
        >
          Withdraw
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

  );
}
