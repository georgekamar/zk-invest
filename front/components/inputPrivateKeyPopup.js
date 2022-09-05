import { useState } from 'react';
import { Button, TextField, Typography } from '@mui/material';

import { Keypair } from '../lib/keypair';

import styles from '../styles/Popups.module.css';

export default function InputPrivateKeyPopup(props) {

  const [error, setError] = useState();
  const [privInput, setPrivInput] = useState();


  const handleSubmitPrivateKey = () => {
    let keypair;
    try {
      keypair = new Keypair(privInput);
      try{
        localStorage.setItem(props?.account.address, privInput);
        props?.setAccount({
          ...props?.account,
          keypair
        });
        props?.setLocalPrivateKeyNotFound(false);
        window.location.reload();
      }catch(e){
        console.log(e)
        setError('An error occured, try refreshing the page');
      }
    }catch(e2){
      console.log(e2)
      setError('Private Key Not Valid');
    }
  }

  const handlePrivInputChange = (e) => {
    setPrivInput(e.target.value);
  }

  return (
    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <Typography color='error'>{error}</Typography>
        <Typography color='black'>We couldnt find your private key in your local storage, please enter it here to access ZK Invest</Typography>
        <TextField
          label='Private Key'
          onChange={handlePrivInputChange}
          value={privInput}
        />
        <Button
          variant='contained'
          size='small'
          onClick={handleSubmitPrivateKey}
        >
          Submit
        </Button>
      </div>
    </div>
  )
}
