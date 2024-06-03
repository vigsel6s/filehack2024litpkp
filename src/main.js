import React, { useState, useEffect} from 'react';
import {ethers} from 'ethers';
import { useNavigate } from 'react-router-dom';
import {initLit, generateAuthSig, decryptLit, getChainId} from './Lit'; 
import yourImage from './metacare.svg'; // replace with your image file path
import DiagnosisModal from './DiagnosisModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { HashLink } from 'react-router-hash-link';
import Web3ShareModal from './Web3ShareModal';
import ViewBinary from './ViewBinary';
import ReactMarkdown from 'react-markdown';
import ConnectWallet from './cWallet';
import { useConnectWallet } from '@web3-onboard/react'
  
const fhirResources = [
  "Patient", "AllergyIntolerance", "Appointment", "Binary", "Condition",
  "Coverage", "Device", "DeviceRequest", "DiagnosticReport", "DocumentReference",
  "Encounter", "ExplanationOfBenefit", "Immunization", "Location", "Medication",
  "MedicationRequest", "MedicationStatement", "Observation",
  "Organization", "Practitioner", "PractitionerRole", "Procedure"
];
const MyRecords = () => {
  const [records, setRecords] = useState([]);
  const [expandedResources, setExpandedResources] = useState({});
  const [showEditorModal, setShowEditorModal] = useState(false);
  const fhirUrl = localStorage.getItem('fhirUrl');
  const [showZeroResources, setShowZeroResources] = useState(false); // New state for controlling visibility of '0' resources
  const [editorModalContent, setEditorModalContent] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [questionType, setQuestionType] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('');
  const [myBirthDate, setMyBirthdate] = useState('');
  const [myGender, setMyGender] = useState('');
  const [myRace, setMyRace] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalContent, setDeleteModalContent] = useState('')
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalSearchContent, setModalSearchContent] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null); 
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const [ethersProvider, setProvider] = useState(ethers.providers.Web3Provider | null)
  const navigate = useNavigate(); 
  const handleDropdownToggle = () => {
    setIsDropdownOpen(prevState => !prevState);      
  };
  const showTerms = () => {
    setModalSearchContent(<Terms onClose={handleClose}></Terms>);
    setShowSearchModal(true);
  };    
  const showPrivacy = () => {
    setModalSearchContent(<Privacy onClose={handleClose}></Privacy>);
    setShowSearchModal(true);
  };
  const showSocialize = async () => {
    setModalSearchContent(<Socialize onClose={handleClose}></Socialize>);
    setShowSearchModal(true);
  };
  const showSponsorship = () => {
      setModalContent("Why should you sponsor me?  Find out [here](https://medium.com/@metacareai/why-you-should-sponsor-meta-care-c222407d3f27)");
      setShowModal(true);
  };
  const showHelp = () => {
      setModalContent("# Help Page: MetaCare Medical Assistant\nHello, and welcome to the Help Page for me, your MetaCare Medical Assistant! As an AI designed to answer medical queries, I am here to guide you on the best ways to interact with me.\n##  Who am I?\nI'm MetaCare Medical Assistant, a cutting-edge artificial intelligence tool powered by OpenAI's GPT technology. I am here to assist you with your health-related queries around the clock.\n## What can I do?\nI can help you understand various health-related topics. From explaining symptoms and medications to clarifying medical procedures and lifestyle recommendations, I strive to offer clear, accurate information. However, please remember that while I aim to provide helpful insights, I am not a substitute for professional medical advice, diagnosis, or treatment.\n## How to use me?\n### Ask me a question:\n Just type your health-related question into the text box and press 'Enter' or the 'Send' button.\n\n### Interpret my response:\n Read the information I provide. If you need more detail or have a follow-up question, don't hesitate to ask!\n\n## Provide feedback:\n I'm always learning! If my responses are useful, let me know by clicking the 'Thumbs Up' icon. If they are not, click the 'Thumbs Down' icon and tell me why, if you can.\n## Common Issues and Solutions\nI am sorry, but as your valuable Meta Care Medical Assistant, I can only chat about medical topics. Please ask only medical questions.:  This occurs when the AI dtermines you are not asking a Medical questions.\nVarious reasons exists ranging from the way you asked your question, to the spelling in your query.  Sometimes it's just something my programmer's overlooked when they trained me.\n If you encounter this error, and you think your question was legitimate, email medicalquestions@medicare.ai and I will re-consider it in my next round of training.\n\n### Inaccurate Responses:\n If you find any of my responses inaccurate, I apologize. Please provide feedback using the 'Thumbs Down' button and explain what went wrong.\n\n### Difficulty Understanding Your Questions:\n To ensure I understand you well, please phrase your questions clearly and avoid using abbreviations or slang that I might not comprehend.\n\n## Technical Issues:\n Experiencing technical problems like slow response times or glitches? Try restarting the app. If the problem continues, get in touch with our support team.\n\n## Contact Us\nNeed more help or have feedback to share about me? Feel free to contact us at support@metacare.ai.\nJust a gentle reminder: While I'm a helpful tool for understanding medical matters, I'm not a replacement for professional medical advice. Always consult with a healthcare provider for serious health concerns.");
      setShowModal(true);
  };
  const backtoChat = () => {
    console.log("here");
    navigate('/');
  }  
  const getmyRecords = () => {
      navigate('/bb-login');
  };
  function calculateAgeFromBirthDate(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();  
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }    
    return age;
  }
  const handleDiagnosisClick = (diagnosis, question_type) => {
    setSelectedDiagnosis(diagnosis);
    setQuestionType(question_type);
    setModalOpen(true);
  };
  useEffect(() => {
    let isMounted = true;    
    const fetchResource = async (resourceName, walletAddress, chainId, authSig) => {
      try{
        const response = await fetch(`${fhirUrl}/${resourceName}`);
        if (!response.ok) {
          setErrorMessage('Internal server error. Please try again later.');
          //throw new Error('Network response was not ok');
          return {
            resource: resourceName,
            total: 0,
            entries: [],
          };
        }
        var bundle = await response.json();
        var refBundle = bundle;
        if (refBundle.entry && Array.isArray(refBundle.entry)) {
          for (let i = 0; i < refBundle.entry.length; i++) {
            let entry = refBundle.entry[i];
            if (entry.file) {
              try {
                const fhirResource = await decryptLit(walletAddress, chainId, authSig, entry.id, entry.file);
                refBundle.entry[i] = JSON.parse(fhirResource);
              } catch (error) {
                console.error('Error decrypting resource:', error);
              }
            }
          }
        } else {
          console.error('No entries found in the bundle or bundle format is incorrect');
        }
        return {
          resource: resourceName,
          total: refBundle.total,
          entries: refBundle.total > 0 && refBundle.entry ? refBundle.entry : [],
        };
      }
      catch(err){
        console.error(err); // It's good to log the error for debugging purposes
        if (err.message.includes('Failed to fetch')) {
          // This error message is typically thrown when a CORS error occurs, or server is unreachable
          setErrorMessage('A network error occurred connecting to the Direct FHIR Server. This may be due to CORS policies blocking the request or if the server is not started.');
        } else {
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
        //throw new Error('Network response was not ok');
        return {
          resource: resourceName,
          total: 0,
          entries: [],
        };        
      }
    };
    const fetchRecordsSequentially = async () => {
      if (!isMounted) return;
      const fetchedRecords = [];
      const initialExpanded = {};
      var provider = null;
      if (wallet?.provider) {
        provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        setProvider(provider)
      }
      else{
        await connect()
      } 
      try{
          window.LitNodeClient = await initLit();
          // Request account access if needed
          var lAddress = localStorage.getItem('walletAddress');
          var lpublicKey = localStorage.getItem('directfhir-publickey');
          var lchainId = localStorage.getItem('directfhir-chainid');
          var lAS = localStorage.getItem('lit-auth-signature')
          if(lAS!==null){lAS=JSON.parse(lAS)}
          if (lpublicKey===null || lAddress ===null || lAS===null || lchainId===null){
              //await window.ethereum.request({ method: 'eth_requestAccounts' });
              // Get the selected account
              provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
              const signer = provider.getSigner();
              lAddress = await signer.getAddress();
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
          for (const resource of fhirResources) {
            const resourceData = await fetchResource(resource,lAddress,lchainId, lAS);
            fetchedRecords.push(resourceData);
            // Expand resources with entries by default, contract otherwise
            initialExpanded[resource] = resourceData.total > 0;
          }
          if (isMounted) {
            setRecords(fetchedRecords);
            setExpandedResources(initialExpanded);
          }
    }
    catch(error){
      if (error.code === 4001) {
        // User rejected the request
        console.error('User rejected the signature request');
        // Handle the user rejection case here, e.g., show a message to the user
        setErrorMessage('Signature request was rejected. Please try again.');
      } 
      else if (error.code === undefined) {
        // User rejected the request
        //console.error('User rejected the signature request');
        // Handle the user rejection case here, e.g., show a message to the user
        //setErrorMessage('Signature request was rejected. Please try again.');
      }else {
        console.error('Error getting signature:', error.code);
        // Handle other errors
        setErrorMessage('An error occurred while getting the signature. Please try again.');
      }
    }
    };
   
    fetchRecordsSequentially();
    const intervalId = setInterval(fetchRecordsSequentially, 5000000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [wallet]);
  const toggleResource = (resourceName) => {
    setExpandedResources(prevState => ({
      ...prevState,
      [resourceName]: !prevState[resourceName],
    }));
  };
  const handleClose = () => setShowSearchModal(false);
  const handleEditorClose = () => setShowEditorModal(false);
  const shareFile = (data) =>{
    setModalSearchContent(<Web3ShareModal
      onClose={() => setShowSearchModal(false)}
      data = {data}
      />);
      setShowSearchModal(true);
  }
  const deleteFile = (id, resourceType) =>{
    setDeleteModalContent(<ConfirmDeleteModal
      onClose={() => setIsDeleteModalOpen(false)}
      resourceType={resourceType}
      resourceId={id}
      onConfirm={() => setIsDeleteModalOpen(false)}
    />);
    setIsDeleteModalOpen(true);
  }
  const openFile = (id, resourceType) => {
    // Assuming `records` is an array of objects, each containing an `entries` array
    let found = false; // Flag to indicate if the record has been found
    console.log(id)
    var foundEntry = null;
    if (id!=null){
      for (const resource of records) {      
        for (const entry of resource.entries) {        
          if (entry.id === id) {
            // If a matching id is found, set the file state to this entry's content and stop searching
            console.log('setting file');
            foundEntry = entry;
            found = true;
            break;
          }
        }
        if (found) break; // Exit the outer loop if the entry has been found
      }    
      if (!found) {
        console.log("No record found with id:", id);      
        // Handle the case where no matching record is found, e.g., set `file` to null or show an error
        foundEntry = {resourceType: resourceType};        
      }
      console.log(foundEntry);      
      setEditorModalContent(<FHIREditor onClose={handleEditorClose} resource={foundEntry} resourceType={resourceType} fhirUrl={fhirUrl}/>);
      setShowEditorModal(true); // Show the editor modal regardless of whether the entry was found
    }
  };
  function camelCaseToLabel(fieldName) {
    const result = fieldName
        .replace(/([A-Z])/g, ' $1')  // Insert space before each uppercase letter
        .replace(/^./, (str) => str.toUpperCase()); // Convert first character to uppercase
    return result.trim(); // Remove any extra spaces at the beginning or end
  }
  const advance = () =>{
    setModalSearchContent(<Advanced onClose={handleClose}></Advanced>);
    setShowSearchModal(true)
  }
  const showBinary = (binaryUrl) => {
    setModalSearchContent(<ViewBinary BinaryUrl={binaryUrl} onClose={handleClose}></ViewBinary>);
    setShowSearchModal(true);
  };
  const findLinkedResource = (reference) => {
    // Assuming `records` is an array of objects, each containing an `entries` array
    const id = reference.split('/')[1];
    const resourceType = reference.split('/')[0];
    let found = false; // Flag to indicate if the record has been found 
    var foundEntry = null;
    if (id!=null){
      for (const resource of records) {      
        for (const entry of resource.entries) {        
          if (entry.id === id && entry.resourceType===resourceType) {
            // If a matching id is found, set the file state to this entry's content and stop searching
            foundEntry = entry;
            found = true;
            break;
          }
        }
        if (found) break; // Exit the outer loop if the entry has been found
      }    
      if (!found) {
        console.log("No record found with id:", id);
      
        // Handle the case where no matching record is found, e.g., set `file` to null or show an error
        foundEntry = {resourceType: resourceType};        
      }
      return (foundEntry)
    }
  };
  const regex = /\/([^\/]+\/[^\/]+)$/; //regex to parse the reference URLs
  const wsk = localStorage.getItem('web3StorageEmail');
  return (
    <div>
    <h1><img src={yourImage} alt="Meta Care"/></h1>
    <label className="menu">
      <button className="menu-button" onClick={handleDropdownToggle}>
      ...
      </button>
      {isDropdownOpen && (
      <div className="dropdown-menu">
          <ConnectWallet></ConnectWallet>
          <button onClick={backtoChat}>Back to Chat</button>
          <button onClick={getmyRecords}>Find My Medical Record</button>
          <button onClick={advance}>Advanced</button> 
          <button onClick={showTerms}>Terms of Use</button>
          <button onClick={showPrivacy}>Privacy</button>
          <button onClick={showSponsorship}>Sponsorship</button>
          <button onClick={showSocialize}>Socialize</button>       
          <button onClick={showHelp}>Help</button>                                    
      </div>
      )}
    </label> 
    <label>
      <input
        type="checkbox"
        checked={showZeroResources}
        onChange={e => setShowZeroResources(e.target.checked)}
      /> Show Resources with '0' entries
    </label>
    {showEditorModal && (
        <div className={'modal'}>
            {editorModalContent}
        </div>
      )}
    {errorMessage && (
    <div className="error-message">
        {errorMessage}
    </div>
    )}
    {modalOpen && (
      <div><DiagnosisModal isOpen={modalOpen} onClose={setModalOpen} diagnosis={selectedDiagnosis} question_type={questionType} race={myRace} age={calculateAgeFromBirthDate(myBirthDate)} gender={myGender} /></div>
    )}    
    {isDeleteModalOpen && (
      <div className='modal'>{deleteModalContent}</div>
    )}
    {showSearchModal && (
        <div className="modal">
            {modalSearchContent}                    
        </div>
    )}
    {showModal && (
        <div className="modal">
            <div className='modal-content'><ReactMarkdown>{modalContent}</ReactMarkdown></div>                    
        </div>
    )}   
    {records.map(({ resource, total, entries }) => (
        // Only render if showZeroResources is true or total is greater than 0
        (showZeroResources || total > 0) && (
          <div>
            <div className="resource-data-header">
            <h2 onClick={() => toggleResource(resource)} style={{cursor: 'pointer'}}>
              My {camelCaseToLabel(resource.replace('Patient', 'Family'))}{resource!=='Patient' && ('s')} ({total}) 
            </h2>            
            </div>            
            {expandedResources[resource] && (
            <ul>
              {entries.length > 0 ? (
                entries.map((entry, index) => (
                  <li key={entry.id + '-' + entry.resourceType + '-' + index}>
                    <div className='resource-data-section' id={entry.resourceType + '/' + entry.id} >                  
                      {entry.patient && entry.patient.reference && entry.patient.reference.includes('http') && (<><strong>Patient:</strong>  <HashLink smooth to={'#' + regex.exec(entry.patient.reference)?.[1]}>{entry.patient.reference}</HashLink><br/></>)}
                      {entry.patient && entry.patient.reference && entry.patient.reference.includes('http') === false && (<><strong>Patient:</strong>  <HashLink smooth to={'#' + entry.patient.reference}>{entry.patient.reference}</HashLink><br/></>)}
                      {entry.subject && entry.subject.reference && entry.subject.reference.includes('http') && (<><strong>Subject:</strong>  <HashLink smooth to={'#' + regex.exec(entry.subject.reference)?.[1]}>{regex.exec(entry.subject.reference)?.[1]}</HashLink><br/></>)}
                      {entry.subject && entry.subject.reference && entry.subject.reference.includes('http') === false && (<><strong>Subject:</strong>  <HashLink smooth to={'#' + entry.subject.reference}>{entry.subject.reference}</HashLink><br/></>)}
                          {(entry.recordedDate || entry.date) && (
                        <><strong>Date:</strong> {new Date(entry.recordedDate || entry.date).toLocaleDateString()}<br/></>
                      )}
                      {entry.description && (<><strong>Description:</strong> {entry.description}<br/></>)}
                      {/* Handling for resource-specific fields that align with USCDI v1 common data elements */}
                                  {/* Correct format for name */}
                      {entry.name?.length > 0 && (
                        <><strong>Name:</strong> <div className='important'>{entry.name.map(n => `${n.family}, ${n.given.join(' ')}`).join('; ')}</div><br/></>
                      )}
                      {/* Additional elements */}
                      {entry.birthDate && (
                        <div><strong>Birth Date:</strong> {entry.birthDate}</div>
                      )}
                      {entry.gender && (
                        <div><strong>Gender:</strong> {entry.gender}</div>
                      )}                      
                      {entry.address && entry.address.map((addr, index) => (
                        <div key={entry.resourceName + '-addr-' + index}><strong>Address:</strong> {addr.line?.join(', ')}, {addr.city}, {addr.state}, {addr.postalCode}</div>
                      ))}
                      {entry.telecom && entry.telecom.map((contact, index) => (
                        <div key={entry.resourceName + '-telco-' + index}><strong>Contact:</strong> {contact.value}</div>
                      ))}
                      {entry.clinicalStatus && (
                        <div><strong>Clinical Status:</strong> {entry.clinicalStatus.text}</div>
                      )}
                      {entry.category && entry.category.coding && (
                        <div>
                          <strong>Category:</strong> {entry.category[0].coding[0].display}
                        </div>
                      )}
                      {entry.serviceType && entry.serviceType.text && (
                        <div>
                          <strong>Service Type:</strong> {entry.serviceType.text}
                        </div>
                      )}
                      {entry.reasonCode && (
                        <div>
                          <strong>Reason: </strong>
                          {entry.reasonCode.map((reason, index) => (
                            reason.text
                          ))}
                        </div>
                      )}
                      {entry.medicationReference && entry.medicationReference.display && (
                        <div>
                          <strong>Medication:</strong> <div className='important'>{entry.medicationReference.display}</div>
                        </div>
                      )}
                      {entry.requester && entry.requester.display && (
                      <div>
                        <strong>Requester: </strong>
                        <button className='button-link'>{entry.display}</button>
                      </div>
                      )}
                      {entry.dosageInstruction && entry.dosageInstruction.map((instruction, dindex) => (
                        <div key={entry.id +'-instruction' + dindex}>
                          {instruction.timing && (
                            <div>
                              <div><strong>Timing:</strong> <div className='important'>{instruction.timing.code.text}</div></div>
                            </div>
                          )}
                          {instruction.text && (
                            <div>
                              <div><strong>Text:</strong> <div className='important'>{instruction.text}</div></div>
                            </div>                       
                          )}
                          {instruction.asNeededBoolean && (
                            <div><strong>As Needed:</strong> {instruction.asNeededBoolean ? 'Yes' : 'No'}</div>
                          )}
                          {instruction.route && instruction.route.text && (
                                <div><strong>Route:</strong> <div className='important'>{instruction.route.text}</div></div>
                          )}
                          {instruction.doseAndRate && (
                                <div><strong>Dose Quantity:</strong> <div className='important'>{instruction.doseAndRate[0].doseQuantity.value}</div></div>
                          )}
                        </div>
                      ))}
                      {entry.dispenseRequest && (
                        <div>
                          <strong>Number of Repeats Allowed:</strong> {entry.dispenseRequest.numberOfRepeatsAllowed}
                        </div>
                      )}
                      {entry.dispenseRequest && (
                        <div>
                          <strong>Expected Supply:</strong> <div className='important'>{entry.dispenseRequest.expectedSupplyDuration.value} {entry.dispenseRequest.expectedSupplyDuration.unit}</div>
                        </div>
                      )}                      
                      {entry.code && (                        
                        <div><strong>{entry.code.coding[0].system}|{entry.code.coding[0].code} <div className='important'>{entry.code.coding[0].display}</div></strong></div>
                      )}
                      {entry.severity && (
                        <div><strong>Severity:</strong> {entry.severity.coding[0].code}<br/></div>
                      )}
                      {entry.criticality && (
                        <div><strong>Criticality:</strong> {entry.criticality}<br/></div>
                      )}                      
                      {entry.valueQuantity && (
                        <><strong>Value:</strong><div className='important'>{entry.valueQuantity.value}{entry.valueQuantity.unit}</div><br/></>
                      )}
                      {entry.component && entry.component.map((component, index) => (
                        <div key={'component-code' + '-' + index}>
                            {component.code.coding && component.code.coding.map((coding, idx) => (
                                <div key={idx}>
                                    <strong>{coding.display}:</strong> <div className='important'>{component.valueQuantity.value} {component.valueQuantity.unit}</div>
                                </div>
                            ))}
                        </div>
                      ))}                                         
                      {entry.medicationCodeableConcept && (
                        <><strong>Medication:</strong> <div className='important'>{entry.medicationCodeableConcept.text}</div><br/></>
                      )}
                      {entry.manufactureDate && (
                        <><strong>Manufacture Date:</strong> {entry.mmanufactureDate}<br/></>
                      )}
                      {entry.expirationDate && (<><strong>Expiration Date:</strong> {entry.expirationDate}<br/></>)}
                      {entry.lotNumber && (<><strong>Lot Number:</strong> {entry.lotNumber}<br/></>)}
                      {entry.serialNumber && (<><strong>Serial Number:</strong> {entry.serialNumber}<br/></>)}
                      {entry.deviceName && (<><strong>Device Name:</strong> <div className='important'>{entry.deviceName[0].name} {entry.deviceName[0].type}</div><br/></>)}
                      {entry.codeCodeableConcept && (<><strong>Requested Device:</strong> <div className='important'>{entry.codeCodeableConcept.text}</div><br /></>)}
                      {entry.telecom && entry.telecom.map((contact, index) => (
                        <div key={index}><strong>Contact:</strong> {contact.value}</div>
                      ))}
                      {entry.result && entry.result.map((result, index) => (
                        <div>
                          <strong>Result: </strong>
                          <HashLink smooth to={'#' + regex.exec(result.reference)?.[1]}>{result.display}</HashLink>
                        </div>
                      ))}
                      {entry.manufacturer && (<><strong>Manufacturer:</strong> <div className='important'>{entry.manufacturer.display}</div><br /></>)}
                      {entry.doseQuantity && (<><strong>Dose:</strong> <div className='important'>{entry.doseQuantity.value} {entry.doseQuantity.unit}</div><br /></>)}

                      {entry.vaccineCode && entry.vaccineCode.coding && (
                        <div>
                          <strong>Vaccine Codes: </strong>

                          {entry.vaccineCode.coding.map((coding, index) => (
                            <div>
                              {coding.display}
                            </div>
                          ))}</div>
                      )}
                      {entry.performer && (
                        <><strong>Performer:</strong> {entry.performer.map(p => p.actor?.display).join(', ')}<br/></>
                      )}
                      {entry.participant && entry.participant.map((practitioner, index) => (
                        practitioner.individual &&
                        <div>
                          <strong>Provider/Location: </strong>
                          <button className='button-link'>{practitioner.individual.display}</button>
                        </div>
                      ))}
                      {entry.participant && entry.participant.map((practitioner, index) => (
                        practitioner.actor &&
                        <div>
                          <strong>Provider/Location: </strong>
                          <button className='button-link'>{practitioner.actor.display}</button>
                        </div>
                      ))}
                      {entry.author && entry.author.map((author, index) => (
                        <div key={'author' + index}>
                          <strong>Author: </strong>
                          <button className='button-link'>{author.display}</button>
                        </div>
                      ))}
                      {entry.content && entry.content.map((content, index) => (
                        <div>
                          <strong>Content: </strong>
                          <button className='button-link' onClick={() => showBinary(content.attachment.url)}>View Note</button>
                        </div>
                      ))}
                      {entry.interpretation && (
                        <div>
                          <strong>Interpretation Codes: </strong>
                          {entry.interpretation.map((interpretation, index) => (
                            <div key={'interp-' + index}>
                              {interpretation.coding.map((coding, idxitp) => (
                                <div className='important' key={'intcode-' + idxitp}>{coding.display}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                       {entry.appointmentType && (
                        <div><strong>Appointment Type:</strong>{entry.appointmentType.text}<br /></div>
                      )}
                      {entry.comment && (
                        <div className='important'><strong>Comment:</strong>{entry.comment}<br /></div>
                      )}
                      {entry.start && (
                        <div className='important'><strong>Timing :</strong> Start: {entry.start ? entry.start : 'N/A'}, End: {entry.end ? entry.end : 'N/A'}<br /></div>
                      )}
                      {entry.minutesDuration && (
                        <div><strong>Duration :</strong>{entry.minutesDuration} minutes.<br /></div>
                      )}
                      {entry.organization && (
                        <><strong>Organization:</strong> {entry.organization.map(o => o.display).join(', ')}<br/></>
                      )}
                      {entry.resourceType==='Coverage' && entry.payor && (
                         <><strong>{entry.payor[0].identifier.value} - <div className='important'>{entry.class.map((classItem) => classItem.value).join(', ')} for Subscriber {entry.subscriberId}</div></strong></>
                      )}                      
                      {entry.period && (
                        <div><strong>Period:</strong> Start: {entry.period.start ? new Date(entry.period.start).toLocaleDateString() : 'N/A'}, End: {entry.period.end ? new Date(entry.period.end).toLocaleDateString() : 'N/A'}<br/></div>
                      )}
                      {entry.effectiveDateTime && (
                        <div><strong>Effective Date/Time</strong>: <div className='important'>{entry.effectiveDateTime}</div><br/></div>
                      )}
                      {entry.diagnosis && (<><strong>Diagnosis Codes:</strong> <div className='important'>{entry.diagnosis.map(d => d.diagnosisCodeableConcept?.coding[0].code).join(', ')}</div><br/></>)}
                      {entry.encounter?.reference && (<><strong>Encounter:</strong>  <HashLink smooth to={'#' + entry.encounter.reference}>{entry.encounter.reference}</HashLink><br/></>)}
                      {entry.status && (<><strong>Status:</strong> {entry.status}<br/></>)}
                      {entry.onsetDateTime && (<><strong>Onset Date/Time:</strong> {entry.onsetDateTime}<br /></>)}                      
                      { (entry.medicationReference || entry.medicationCodeableConcept) && entry.resourceType==='MedicationRequest' && (                                                                        
                        <div className="faq-parent">
                          <div className='important'>Frequently Asked Questions</div>                          
                          <div className="faq-container">
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.medicationReference ? entry.medicationReference.display : entry.medicationCodeableConcept.text, 'whatismed')}>
                                What is it used to treat?
                              </button>
                            </p>
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.medicationReference ? entry.medicationReference.display : entry.medicationCodeableConcept.text, 'sideeffects')}>
                                What are the side effects?
                              </button>
                            </p>
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.medicationReference ? entry.medicationReference.display : entry.medicationCodeableConcept.text, 'altmed')}>
                                What are similar medicines I can discuss with my doctor?                    
                              </button>
                            </p>
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.medicationReference ? entry.medicationReference.display : entry.medicationCodeableConcept.text, 'manu')}>
                                Who is the manufacturer?
                              </button>
                            </p>
                          </div>
                        </div>
                      )}
                      {entry.vaccineCode && entry.resourceType === 'Immunization' && (
                        <div className="faq-parent">
                          <div className='important'>Frequently Asked Questions</div>
                          <div className="faq-container">
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.vaccineCode.coding[0].display, 'whatisvac')}>
                                What is it and what is it used to prevent?
                              </button>
                            </p>
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.vaccineCode.coding[0].display, 'vacsideeffects')}>
                                What are the side effects?
                              </button>
                            </p>
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.vaccineCode.coding[0].display, 'altmed')}>
                                What are similar vaccines I can discuss with my doctor?
                              </button>
                            </p>
                            <p>
                            </p>
                          </div>
                        </div>
                      )}
                      {entry.resourceType === 'Observation' && entry.category && entry.category[0].text === 'Vital Signs' && entry.code.coding[0].display === 'Blood Pressure' && (
                        <div className="faq-parent">
                          <div className='important'>Frequently Asked Questions</div>
                          <div className="faq-container">
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].system + ' code ' +
                                entry.code.coding[0].code + ' ' +
                                entry.component[0].code.text + ': ' +
                                entry.component[0].valueQuantity.value + ' ' +
                                entry.component[0].valueQuantity.unit + ' - ' +
                                entry.component[1].code.text + ': ' +
                                entry.component[1].valueQuantity.value + ' ' +
                                entry.component[1].valueQuantity.unit + ' ',
                                'int-vital-bp')}>
                                Interpret my Vitals
                              </button>
                            </p>
                          </div>
                        </div>
                      )}
                      {entry.resourceType === 'Observation' && entry.category && entry.code.coding[0].display !== 'Blood Pressure' && (
                        <div className="faq-parent">
                          <div className='important'>Frequently Asked Questions</div>
                          <div className="faq-container">
                            <p>
                              <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display + ' with a value of ' +
                                entry.valueQuantity.value + ' ' + entry.valueQuantity.unit,
                                'int-vital-other')}>
                                Interpret my Vitals
                              </button>
                            </p>
                          </div>
                        </div>
                      )} 
                      {entry.resourceType ==='AllergyIntolerance' && (
                          <div className="faq-parent">
                          <div className='important'>Frequently Asked Questions</div>                          
                          <div className="faq-container">
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'aller-cause')}>
                            What causes it?
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'aller-find')}>
                            What Are My Testing Options?
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'aller-cp')}>
                            What could my Care Plan Include?                    
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'aller-meds')}>
                            What Medications should I discuss with my doctor?
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'aller-heir')}>
                            Is this hereditary?  Will it ever go away?
                          </button>
                          </p>
                        </div>
                      </div>                              
                      )}
                      {entry.resourceType==='Procedure' && (
                        <div className="faq-parent">
                          <div >More</div>                          
                          <div className="faq-container">
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'proc-reco')}>
                          What should I expect during recovery?
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'proc-resume')}>
                          When can I resume normal activities?
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'proc-follow')}>
                          What Follow-up Care or Appointments Could Be Needed ?                    
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'proc-comp')}>
                            What complications should I watch for?
                          </button>
                          </p>
                          <p>
                          <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'proc-affects')}>
                            What are the long term affects?
                          </button>
                          </p>
                        </div>
                      </div>                      
                      )}
                      {entry.code && entry.resourceType==='Condition' && (
                        <div className="faq-parent">
                            <div >More</div>                          
                            <div className="faq-container">
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'whatis')}>
                              What is it?
                            </button>
                            </p>
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'treat')}>
                              What Are My Treatment Options?
                            </button>
                            </p>
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'careplan')}>
                              What could my Care Plan Include?                    
                            </button>
                            </p>
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'meds')}>
                              What Medications should I discuss with my doctor?
                            </button>
                            </p>
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.code.coding[0].display, 'test')}>
                              What Tests could be performed?
                            </button>
                            </p>
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.diagnosisCodeableConcept.coding[0].display, 'goal')}>
                              What should my health care goals be?
                            </button>
                            </p>
                            <p>
                            <button className='button-link' onClick={() => handleDiagnosisClick(entry.diagnosisCodeableConcept.coding[0].display, 'risk')}>
                              Help me understand my risks
                            </button>
                            </p>
                          </div>
                        </div>
                      )}
                      {entry.id && (                        
                        <div className='faq-parent'>
                          <div className='important'>Actions &gt;</div>
                         <div className='faq-container'><button onClick={() => deleteFile(entry.id, entry.resourceType)}>Del</button> {wsk && ( <button onClick={() => shareFile(entry)}>Share</button>)}</div>
                        </div>
                      )} 
                    </div>
                  </li>
                ))
              ) : (
                <li>No entries found for this resource.</li>
              )}
            </ul>
          )}
          </div>
        )
      ))}
      <><div><button onClick={getmyRecords}>Find My Medical Records</button></div><div className="copyright">Copyright 2023-2024 Meta Care.  All rights reserved.</div><div className="disclaimer">Disclaimer: Service is for educational and informational purposes, not clinical decisions.</div></>  
    </div>
  );
};
export default MyRecords;
