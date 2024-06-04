
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { ethConnect } from '@lit-protocol/lit-node-client';
export async function initLit () {
        if (window.ethereum) {
            try {
                const client = new LitJsSdk.LitNodeClient({litNetwork: 'cayenne'});
                await client.connect();
                return client;
                
            } catch (error) {
                console.error('Error initializing provider or fetching user account:', error);
                return undefined;
            }
        } else {
            console.log('MetaMask is not installed!');
            return undefined;
        }
};        
export async function generateAuthSig (publicKey, provider) {
    if (publicKey != null && provider) {
        const authSig = await ethConnect.signAndSaveAuthMessage({
            web3: provider,
            account: publicKey.toLowerCase(),
            chainId: 5,
            resources: {},
            expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        });
        return authSig;
    }
}
export function parseEncHash(url) {
    try{
        const urlObj = new URL(url);
        const encHash = urlObj.pathname.parse('/')[-1];  
        console.log(encHash)
        return encHash;
    }
    catch(error){
        return url;
    }
}  
export async function decryptLit(walletAddress, chainId, authSig, encHash, encJSON) {
    try {
        if (walletAddress) {     
        console.log(walletAddress)       
        const userSelfCondition = [{
            chain: "ethereum",
            conditionType: "evmBasic",
            contractAddress: "",
            method: "",
            parameters: [':userAddress'],
            returnValueTest : {comparator: '=', value: walletAddress} ,
            standardContractType :  ""
        }]            
        if (encHash) {
            console.log("decrypting with Lit " + encJSON);
            const decryptString = await LitJsSdk.decryptToString( {
                ciphertext: encJSON,          
                dataToEncryptHash: encHash,
                accessControlConditions: userSelfCondition,
                chain: chainId,
                authSig,
            },
            window.LitNodeClient,
            );            
            return decryptString;
        } 
        else{
            console.error('missing hash');
        }  
        }
    }  
    catch (error) {
        console.error('Failed to decrypt file:', error);
    }
}
export async function encryptLit(publicKey, data, chainId, authSig, userAccessControlConditions) {
    const JSONData = JSON.stringify(data)
    const blob = new Blob([JSONData], { type: "application/json" });
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptFile(
        {
        accessControlConditions: userAccessControlConditions,
        authSig: authSig,
        chain: chainId,
        file: blob,
        },
        window.LitNodeClient 
    );
    const hash = dataToEncryptHash;
    const encFile = ciphertext;
    return {file: encFile, id: hash};
}
export function getChainId(network){
    return String(network.chainId).padStart(6, "0");
}  

