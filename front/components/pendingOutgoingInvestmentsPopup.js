import { useState } from 'react';

import { Button, Typography } from '@mui/material';
import { BigNumber, utils } from 'ethers';
import { cancelInvestment } from '../lib';

import DotsComponent from './dots';

import styles from '../styles/Popups.module.css';

export default function PendingOutgoingInvestmentsPopup(props) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();

  const handleCancelInvestment = async (utxo) => {

    try{

      setLoading(true);
      setLoadingMessage('Fetching transactions');
      const sisterCommitment = await props?.signer?.pendingCommitmentToCommitment(utxo.getCommitment());
      const sisterUtxo = props?.pendingCancellableCommitmentUtxos?.find(transaction => transaction?.getCommitment().eq(sisterCommitment));

      setLoadingMessage('Generating proof and awaiting signature');
      await cancelInvestment({
        zkInvest: props?.signer,
        outputs: [utxo, sisterUtxo]
      });

      window.location.reload();

    }catch(error){
      console.log(error)
      if(error?.code == 'ACTION_REJECTED'){
        setError('Transaction signature was refused')
      }else{
        setError('There was a problem cancelling this investment, try reloading the page and retrying');
      }
    }finally{
      setLoading(false);
    }

  }

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color="#555">Pending Investments</Typography>
        </div>
        <div style={{overflowY: 'scroll'}}>
          {
            props?.pendingCancellableCommitmentUtxos?.map((utxo, i) => (
              <div key={i.toString()} style={{backgroundColor: '#FFF', borderRadius: 10, margin: 5, padding: 5}}>
                <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                  <div style={{textAlign: 'left'}}>
                    {/* <Typography><b>Your Project</b></Typography> */}
                    <Typography color='#888'>Project: {props?.projects?.find(p => p?.creator?.publicKey === utxo?.destPubAddress?.toHexString())?.title}</Typography>
                    <Typography color='#888'>Amount: {utils.formatEther(utxo?.amount)} WETH</Typography>
                  </div>
                  <Button
                    variant='contained'
                    size='small'
                    onClick={() => handleCancelInvestment(utxo)}
                    style={{marginLeft: 'auto', marginRight: 5}}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))
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
