import React, { useState } from "react";
import { 
  ChakraProvider,
  Box, 
  Input, 
  Button, 
  Flex, 
  Text, 
  Image, 
  theme 
} from "@chakra-ui/react";
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { SearchIcon, ViewIcon } from "@chakra-ui/icons";
import { ColorModeSwitcher } from './ColorModeSwitcher';

function App() {
  const [query, setQuery] = useState("");
  const [ids, setIds] = useState([]);
  //const [myArray, setMyArray] = useState([1, 2, 3, 4, 5]);
  const [lastQuery, setLastQuery] = useState(null);
  const [error, setError] = useState(null);

  const renderImages = (intArray) => {
    return intArray.map((int, index) => (
      <Image
        key={index}
        src={`http://170.187.170.169:8080/image/${int}`}
        alt={`Result ${index + 1}`}
        boxSize="150px"
        objectFit="cover"
      />
    ));
  };

  const Search = async () => {
    setLastQuery(query);
    const formData = new FormData();
    formData.append('query', query);
    try {
        const response = await fetch('http://170.187.170.169:8080/search/text/', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const data = await response.json();
        setIds(data.ids);
        setError(null);
      } else {
        setError('Upload failed');
      }
    } catch (error) {
      setError('There was a problem uploading the file');
    }
  };

  const ImageUpload = () => {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
  };

  const FileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
  
    const formData = new FormData();
    formData.append('image', file);
  
    try {
        const response = await fetch('http://170.187.170.169:8080/search/image/', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const data = await response.json();
        setIds(data.ids);
        setError(null);
      } else {
        setError('Upload failed');
      }
    } catch (error) {
      setError('Error submitting query');
    }
  }; 

  return (
    <ChakraProvider theme={theme}>
      <Box padding="5%">
        {error && (
          <Alert status="error" marginBottom="1rem">
            <AlertIcon />
            <AlertTitle mr={2}>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
          <ColorModeSwitcher position="absolute" top="1rem" right="1rem" />
          <Input 
            flex="1" 
            placeholder="Search here..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Input type="file" id="fileInput" accept="image/*" style={{ display: 'none' }} onChange={FileChange} />
          <Button marginLeft="1rem" onClick={ImageUpload} leftIcon={<ViewIcon />}>
            Upload
          </Button>
          <Button marginLeft="1rem" onClick={Search} leftIcon={<SearchIcon />}>
            Search
          </Button>
        </Flex>
  
        <Text fontSize="xl" marginBottom="1rem">
          Last query: {lastQuery || "None"}
        </Text>
  
        {/* Sample image results - you'd probably map over some state here */}
        <Flex justifyContent="space-between">
	  {renderImages(ids)}
        </Flex>
      </Box>
    </ChakraProvider>
  );
}

export default App;
