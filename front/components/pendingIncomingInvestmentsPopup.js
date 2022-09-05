import { useState } from 'react';

import { Button, Typography } from '@mui/material';
import { BigNumber, utils } from 'ethers';
import Utxo from '../lib/utxo';
import { Keypair } from '../lib/keypair';
import { acceptInvestment } from '../lib';

import DotsComponent from './dots';

import styles from '../styles/Popups.module.css';

export default function PendingIncomingInvestmentsPopup(props) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();

  const handleAcceptInvestment = async (utxo) => {

    try{

      setLoading(true);
      const acceptInvestmentUtxo = new Utxo({
        amount: utxo.amount.div(props?.projectToken.value),
        tokenId: props?.projectToken.id,
        srcPubKey: props?.account?.keypair?.pubkey,
        srcEncryptionAddress: props?.account?.keypair.address(),
        keypair: Keypair.fromString(utxo.srcEncryptionAddress)//{pubkey: projectReceiveUtxo.srcPubKey}
      })

      setLoadingMessage('Generating proof and awaiting signature');
      await acceptInvestment({
        zkInvest: props?.signer,
        utxoReceived: utxo,
        utxoSent: acceptInvestmentUtxo,
        projectTokenValue: props?.projectToken.value
      })

      window.location.reload();

    }catch(error){
      console.log(error)
      if(error?.code == 'ACTION_REJECTED'){
        setError('Transaction signature was refused')
      }else{
        setError('There was a problem accepting this investment, try reloading the page and retrying');
      }
    }finally{
      setLoading(false);
    }

  }

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' disabled={loading} style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color="#555">Investments Awaiting Your Approval</Typography>
        </div>
        <Typography color='error'>{error}</Typography>
        <div style={{overflowY: 'scroll'}}>
          {
            props?.pendingIncomingCommitmentUtxos?.length ?
            props?.pendingIncomingCommitmentUtxos?.map((utxo, i) => (
              <div key={i.toString()} style={{backgroundColor: '#FFF', borderRadius: 10, margin: 5, padding: 5}}>
                <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                  <Typography color='#888'>Amount: {utils.formatEther(utxo?.amount)} WETH</Typography>
                  <Button
                    variant='contained'
                    size='small'
                    disabled={loading}
                    onClick={() => handleAcceptInvestment(utxo)}
                    style={{marginLeft: 'auto', marginRight: 5}}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            )) :
            <Typography color="#555">There are no investments awaiting your approval</Typography>
          }
        </div>
        <p style={{color: 'transparent'}}>-</p>
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
