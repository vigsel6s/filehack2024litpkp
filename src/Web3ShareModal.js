import React, { useState, useEffect } from 'react';
import ShareModal from 'lit-share-modal-v3';
import { create } from '@web3-storage/w3up-client'
import {ethers} from 'ethers';
import { v4 } from "uuid";
import {initLit, generateAuthSig, encryptLit, getChainId} from './Lit';
import { useConnectWallet } from '@web3-onboard/react';
import * as Name from 'w3name'

const Web3ShareModal = ({onClose, data}) => {
    const [encryptData, setEncryptData] = useState(true); // Default to true for encryption
    const [uri, setUri] = useState(true);
    const [errorMessage, setErrorMessage] = useState(''); 
    const [showSetRecipientsModal, setShowSetRecipientsModal] = useState(false);
    const [accessControlConditions, setAccessControlConditions] = useState('');

    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
    const [ethersProvider, setProvider] = useState(ethers.providers.Web3Provider | null)
  
  
    useEffect(() => {
        // If the wallet has a provider than the wallet is connected
        if (wallet?.provider) {
          setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
          // if using ethers v6 this is:
          // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
        }
        else{connect()}
      }, [wallet])
    // Function to handle saving the data
    const onUnifiedAccessControlConditionsSelected = (shareModalOutput) => {
        // Since shareModalOutput is already an object, no need to parse it
        // Check if shareModalOutput has the property "unifiedAccessControlConditions" and it's an array
        if (shareModalOutput.hasOwnProperty("unifiedAccessControlConditions") && Array.isArray(shareModalOutput.unifiedAccessControlConditions)) {
          setAccessControlConditions(shareModalOutput.unifiedAccessControlConditions);
        } else {
          // Handle the case where "unifiedAccessControlConditions" doesn't exist or isn't an array
          console.error("Invalid shareModalOutput: missing unifiedAccessControlConditions array");
        } 
        setShowSetRecipientsModal(false);
      }; 

    const handleShare= async (e) => {  
        e.preventDefault();      
        let postData = data;
        if (encryptData) {
            window.LitNodeClient = await initLit();
            var lAddress = localStorage.getItem('walletAddress');
            var lpublicKey = localStorage.getItem('directfhir-publickey');
            var lchainId = localStorage.getItem('directfhir-chainid');
            var lAS = localStorage.getItem('lit-auth-signature')
            if(lAS!==null){lAS=JSON.parse(lAS)}
            if (lpublicKey===null || lAddress ===null || lAS===null || lchainId===null){
                //await window.ethereum.request({ method: 'eth_requestAccounts' });
                // Get the selected account
                const provider = ethersProvider;
                const signer = provider.getSigner();
                const lAddress = await signer.getAddress();
                console.log(lAddress)
                const message = 'Generate public key';
                const signature = await signer.signMessage(message);
                lpublicKey = ethers.utils.recoverPublicKey(
                    ethers.utils.hashMessage(message),
                    signature
                )
                const network = await provider.getNetwork();
                lchainId = getChainId(network);
                localStorage.setItem('walletAddress', lAddress);
                localStorage.setItem('directfhir-publickey', lpublicKey);
                localStorage.setItem('directfhir-chainid', lchainId);
                if (lAS===null){
                    var lAS = await generateAuthSig(lAddress, provider);
                }
                else{
                    try{
                        lAS = JSON.parse(lAS);
                        console.log(lAS);
                    }
                    catch(e){
                        setErrorMessage(e);
                    }
                }    
            }

            const userAccessControlConditions = [{
                chain: "ethereum",
                conditionType: "evmBasic",
                contractAddress: "",
                method: "",
                parameters: [':userAddress'],
                returnValueTest : {comparator: '=', value: lAddress} ,
                standardContractType :  ""
              }]           
            // Perform encryption using Lit component
            postData = await encryptDataWithLit(lpublicKey,data, lchainId,lAS, userAccessControlConditions);    
               
        }
        try {
            const web3StorageEmail = localStorage.getItem('web3StorageEmail');

            const uuid = v4();
              if (web3StorageEmail!==undefined){
                const encHash = postData.id
                console.log('creating file')
                console.log('encrypted' + postData.file)

                //Upload File to IPFS
                const client = await create();
                const account = await client.login(web3StorageEmail)
                console.log('loggd in')
                // wait for payment plan to be selected
                while (true) {
                    const res = await account.plan.get()
                    if (res.ok) break
                    console.log('Waiting for payment plan to be selected...')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
                //const space = await client.createSpace('metacare-rich')
                //console.log('created space')
                //await account.provision(space.did())
                //console.log('account connected to space' + space.did())
                //await space.save()
                //console.log('space saved')
                await client.setCurrentSpace('did:key:z6MkqJEusbeUsCmr2ZytrqcnzZTn8zzrutkV6TKBYpegGvJ3')
                console.log('current space set')
                console.log('creating file ' + postData.file + ' with name =' + `${data.resourceType}/${encHash}`)

               // Convert the encrypted text to a Blob
               const blob = new Blob([postData.file], { type: 'text/plain' });

               // Create a File object from the Blob
               const file = new File([blob], `${data.resourceType}/${encHash}`, { type: 'text/plain' });
               const files = [file]
               // Upload the file
              
                // Upload the file stream
                console.log('uploading file')
                const cid = await client.uploadDirectory(files);
                //const cid = await client.uploadFile(file);
                console.log(cid)
                const uri = "https://" + cid + ".ipfs.w3s.link/" + data.resourceType + "/" + encHash;
                console.log(uri)
                //create new did registry entry
                console.log("stored files with cid:", cid);
                const name = await Name.create();
                console.log('created new name: ', name.toString());
                localStorage.setItem('ipns-name', name)
                // value is an IPFS path to the content we want to publish
                const value = '/ipfs/' + cid;
                // since we don't have a previous revision, we use Name.v0 to create the initial revision
                const revision = await Name.v0(name, value);
                await Name.publish(revision, name.key);
                console.log("uri:", uri);
                setUri(uri);
                console.log('Data shared successfully');
                setErrorMessage(uri)
            }
            else{
                setErrorMessage('Please set your Web3 Storage Email in the Advanced Configuration.')
            }
        } catch (error) {
            console.error('Error saving data:', error);
            // Handle error, show error message, etc.
            setErrorMessage(error);
        }
    };
    // Function to encrypt the data using Lit component
    const encryptDataWithLit = async (publicKey, data, chainId, authSig, userAccessControlConditions) => {
        // Example: Pass data to Lit component for encryption
        return await encryptLit(publicKey, data, chainId, authSig, userAccessControlConditions)
    };
    // Function to handle toggling encryption
    const handleToggleEncryption = () => {
        setEncryptData(!encryptData); // Toggle the encryption state
    };      
    const handleSetRecipients= (e) => {
        e.preventDefault();

        setShowSetRecipientsModal(true);
    }
    return (
        <div className='modal-content'>
            <span className="close-btn" onClick={() => onClose(false)}>
            &times;
            </span>
            <div><h2>Meta Share</h2></div>
            <div>
            <form className="form-share" onSubmit={handleShare}>
                <div>
                    <div>Share your data to <a a href="https://console.web3.storage/" target='_blank'>Web3.Storage</a> (IPFS) <br/>
                    using your configured email address in the Advanced menu.</div>
                    <div>Requires <a href="https://metamask.io/download/" target="_blank">Metamask Wallet</a></div>                
                    <div>                
                        <label>
                            <input
                                type="checkbox"
                                checked={encryptData}
                                onChange={handleToggleEncryption}
                            />
                            Encrypt
                        </label><br/>
                    </div>
                    <div>   
                        {showSetRecipientsModal && (
                            <div className='modal'>
                                    <div className='lit-share-modal'><ShareModal
                                        onClose={() => setShowSetRecipientsModal(false)}
                                        onUnifiedAccessControlConditionsSelected={
                                            onUnifiedAccessControlConditionsSelected
                                          }
                                    />
                                </div>
                            </div>
                        )} 
                        <div>
                            <button onClick={() => handleSetRecipients}>Set Recipients</button> | <button onClick={() => handleShare}>Share</button>
                        </div>
                    </div>
                </div>
            </form>
            </div>
        </div>
    );
};
export default Web3ShareModal;
