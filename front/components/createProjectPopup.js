import { useState } from 'react';
import { utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
// import { createProject } from '../lib';

import styles from '../styles/Popups.module.css';

export default function CreateProjectPopup(props) {

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(null);
  const [description, setDescription] = useState(null);
  const [tokenValue, setTokenValue] = useState(null);


  const handleSubmitNewProject = async () => {

    if(!title){
      setError('Enter a title for your project');
    }

    if(!description){
      setError('Describe your project');
    }

    let parsedTokenValue;
    try{
      parsedTokenValue = utils.parse(tokenValue);
    }catch(e){
      setError('Invalid Amount');
    }

    setLoading(true);
    try{
      // await createProject({
      //   zkInvest: props?.signer,
      //   account: {
      //     owner: props?.account?.address,
      //     publicKey: props?.account?.keypair?.address()
      //   },
      //   title,
      //   description,
      //   tokenValue: parsedTokenValue
      // })
      props?.hidePopup();
    }catch(error){
      setError('There was an error creating your project, please reload the page and try again');
    }

  }

  const handleTitleChange = (e) => {
    setTitle(e.nativeEvent.text);
  }

  const handleDescriptionChange = (e) => {
    setDescription(e.nativeEvent.text);
  }

  const handleTokenValueChange = (e) => {
    setTokenValue(e.nativeEvent.text);
  }

  return (

    <div className={styles.popupContainer}>
      <Typography color='error'>{error}</Typography>
      <Typography color='black'>We couldn't find your private key in your local storage, please enter it here to access ZK Invest</Typography>
      <TextField
        label='Project Title'
        onChange={handleTitleChange}
        value={title}
      />
      <TextField
        label='Project Description'
        onChange={handleDescriptionChange}
        value={description}
      />
      <TextField
        label='Project Token Value (in WETH)'
        onChange={handleTokenValueChange}
        value={tokenValue}
      />
      <Button
        variant='contained'
        size='small'
        disabled={!title || !description || !tokenValue || loading}
        onClick={handleSubmitNewProject}
      >
        Submit
      </Button>
    </div>

  )
}
