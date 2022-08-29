import { useState, useEffect } from 'react';
import { BigNumber, utils } from 'ethers';
import { Button, TextField, Typography } from '@mui/material';
// import { createProject } from '../lib';

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
      if(parsedTokenValue.lte(BigNumber.from(0))){
        throw 'Error';
      }
    }catch(e){
      setError('Invalid Amount');
      return;
    }

    setLoading(true);
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
      setLoading(false);
      props?.hidePopup();
    }catch(error){
      setError('There was an error creating your project, please reload the page and try again');
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
        <Button color='error' style={{marginLeft: 'auto'}} onClick={() => props?.hidePopup()}>x</Button>
        <Typography color='error'>{error}</Typography>
        <Typography color='#444'>Create Project</Typography>
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
    </div>

  )
}
