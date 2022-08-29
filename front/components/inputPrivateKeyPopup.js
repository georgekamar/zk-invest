import { useState } from 'react';
import { Button, TextField, Typography } from '@mui/material';


import styles from '../styles/Popups.module.css';

export default function InputPrivateKeyPopup(props) {

  const [error, setError] = useState();
  const [privInput, setPrivInput] = useState();


  const handleSubmitPrivateKey = (privInput) => {
    let keypair;
    try {
      keypair = new Keypair(privInput);
    }catch(e){
      setError('Private Key Not Valid');
    }finally{
      try{
        localStorage.setInput(props?.account.address, privInput);
        props?.setAccount({
          ...account,
          keypair
        });
        props?.setLocalPrivateKeyNotFound(false);
      }catch(e){
        window.location.reload();
      }
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
