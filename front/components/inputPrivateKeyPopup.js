import { useState } from 'react';
import { Button, TextField, Typography } from '@mui/material';


import styles from '../styles/Popups.module.css';

export default function InputPrivateKeyPopup(props) {

  const [error, setError] = useState(null);
  const [privInput, setPrivInput] = useState(null);

  const handleSubmitPrivateKey = () => {
    props?.handleSubmitPrivateKey(privInput);
  }

  const handlePrivInputChange = (e) => {
    setPrivInput(e.nativeEvent.text);
  }

  <div className={styles.popupContainer}>
    <Typography color='error'>{error}</Typography>
    <Typography color='black'>We couldn't find your private key in your local storage, please enter it here to access ZK Invest</Typography>
    <TextField
      label='Private Key'
      onChange={handlePrivInputChange}
      value={privInput}
    />
    <Button onClick={handleSubmitPrivateKey}>Submit</Button>
  </div>
}
