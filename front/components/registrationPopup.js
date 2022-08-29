import { Button, Typography } from '@mui/material';

import styles from '../styles/Popups.module.css';

export default function RegistrationPopup(props){

  const privateKey = props?.privateKey;

  return (
    <div className={styles.popupContainer}>
      <Typography color='black'>This is your ZK Invest private key, store it somewhere safe in case you need to recover your funds</Typography>
      <Typography color='black'>{privateKey}</Typography>
      <Button onClick={props?.handleConfirmation}>I stored my key safely</Button>
    </div>
  )

}
