import { useState, useEffect } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
// import { createProject } from '../lib';

import DotsComponent from './dots';

import styles from '../styles/Popups.module.css';

async function createProject({ zkInvest, account, title, description, tokenValue }) {
    const receipt = await zkInvest.createProject(account, title, description, tokenValue, {
      gasLimit: 2e6
    });
    await receipt.wait();
}

export default function CreateProjectPopup(props) {

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState();

  const [title, setTitle] = useState();
  const [description, setDescription] = useState();
  const [tokenValue, setTokenValue] = useState();

  // useEffect(() => {
    // console.log('title', title)
    // console.log('description', description)
    // console.log('tokenVal', tokenValue.toString())
    // console.log('!title', !title)
    // console.log('!description', !description)
    // console.log('!tokenVal', !tokenValue)
    // console.log('loading', loading)
  //
  // }, [title, description, tokenValue, loading])

  const handleSubmitNewProject = async () => {

    if(!title){
      setError('Enter a title for your project');
      return;
    }

    if(!description){
      setError('Describe your project');
      return;
    }

    let parsedTokenValue;
    try{
      parsedTokenValue = utils.parseEther(tokenValue);
      if(parsedTokenValue.lt(BigNumber.from(0))){
        throw 'Error';
      }
    }catch(e){
      setError('Invalid Amount');
      return;
    }

    setLoading(true);
    setLoadingMessage('Awaiting signature');

    try{
      await createProject({
        zkInvest: props?.signer,
        account: {
          owner: props?.account?.address,
          publicKey: props?.account?.keypair?.address()
        },
        title,
        description,
        tokenValue: parsedTokenValue
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

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  }

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  }

  const handleTokenValueChange = (e) => {
    setTokenValue(e.target.value);
  }

  return (

    <div className={styles.popupContainerContainer}>
      <div className={styles.popupContainer}>
        <div className={styles.popupHeader}>
          <Button color='error' disabled={loading} style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
          <Typography color='#444'>Create Project</Typography>
        </div>
        <Typography color='error'>{error}</Typography>
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
