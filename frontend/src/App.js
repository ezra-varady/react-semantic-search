import React, { useState, useCallback, useEffect } from "react";
import { 
  ChakraProvider,
  Box, 
  Input, 
  Button, 
  Flex, 
  Text, 
  Image, 
  Center, 
  theme 
} from "@chakra-ui/react";
import { Alert, AlertIcon, AlertTitle, AlertDescription, Spinner } from '@chakra-ui/react';
import { SearchIcon, ViewIcon } from "@chakra-ui/icons";
import { ColorModeSwitcher } from './ColorModeSwitcher';
import Carousel, { Modal, ModalGateway } from "react-images";
import './App.css'

function App() {
  const [query, setQuery] = useState("A funny llama");
  const [recentQueries, setRecentQueries] = useState([]);
  const [error, setError] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [viewerIsOpen, setViewerIsOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);


  const openLightbox = useCallback((col, row) => {
      setCurrentImage({row: row, col: col});
      setViewerIsOpen(true);
  }, []);

  const closeLightbox = () => {
      setCurrentImage(null);
      setViewerIsOpen(false);
  };

  const renderImages = (intArray, arrayIndex) => {
    return intArray.map((int, index) => (
      <Image
        key={index}
        src={`/api/image/${int}`}
        alt={`Result ${index + 1}`}
        boxSize="150px"
        objectFit="cover"
        onClick= { () => openLightbox(index, arrayIndex) }
        _hover={{ opacity: .8 }}
      />
    ));
  };

  const renderQuery = (query) => {
    if (query.typ === 'image') {
      return <Image src={query.query} alt="Searched" boxSize="100px" objectFit="cover" />;
    } else if (query.typ === 'text') {
      return query.query;
    }
    return null;
  };

  const Search = async () => {
    setSearchLoading(true);
    const formData = new FormData();
    formData.append('query', query);
    try {
        const response = await fetch('/api/search/text/', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const data = await response.json();
        setRecentQueries([{ query: query, ids: data.ids, typ:'text' }, ...recentQueries].slice(0, 4));
        setError(null);
        setSearchLoading(false);
      } else {
        setError('Search failed');
        setSearchLoading(false);
      }
    } catch (error) {
      setError('There was an error submitting your query');
      setSearchLoading(false);
    }
  };

  const ImageUpload = () => {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
  };

  const FileChange = async (e) => {
    setImageLoading(true);
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
  
    try {
        const response = await fetch('/api/search/image/', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const data = await response.json();
        const reader = new FileReader();

        // Make url object out of uploaded image so we can use it later
        reader.onloadend = () => {
          setRecentQueries([{ query: reader.result, ids: data.ids, typ:'image' }, ...recentQueries].slice(0, 4));
        };
        reader.readAsDataURL(file);

        setError(null);
        setImageLoading(false);
      } else {
        setError('Upload failed');
        setImageLoading(false);
      }
    } catch (error) {
      setError('There was an errror uploading your file');
      setImageLoading(false);
    }
  }; 

  useEffect(() => {
      const runInitialSearch = async () => {
      setQuery('A funny llama');
      await Search();
    };
    runInitialSearch();
  }, []);

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
          <Button marginLeft="1rem" onClick={ImageUpload} leftIcon={ imageLoading ? (
              <Spinner size='sm' />
          ) : (
              <ViewIcon />
          )}>
            Upload
          </Button>
          <Button marginLeft="1rem" onClick={Search} leftIcon={ searchLoading ? (
              <Spinner size='sm' />
          ) : (
              <SearchIcon /> 
          )}>
            Search
          </Button>
        </Flex>
  
        <Text fontSize="xl">
          Query: { recentQueries[0] && renderQuery(recentQueries[0]) }
        </Text>
  
        <Flex justifyContent="space-between" flexWrap="wrap" mt="10">
	  {recentQueries[0] && renderImages(recentQueries[0].ids, 0)}
        </Flex>
      </Box>
      <Box padding="5%" mt="8">
        <Text fontSize="xl">Recent Queries:</Text>
        {recentQueries.slice(1).map((recentQuery, index) => (
          <Box key={index} mt="4">
            <Text fontSize="md">Query: { renderQuery(recentQuery) }
            </Text>
            <Flex justifyContent="center" flexWrap="wrap" mt="2">
              {renderImages(recentQuery.ids, index+1)}
            </Flex>
          </Box>
        ))}
      </Box>
      <ModalGateway>
        {viewerIsOpen && (
        <Modal onClose={closeLightbox}>
          <Center>
            <div className='center-carousel'>
              <Carousel
                currentIndex={currentImage.col}
                views={recentQueries[currentImage.row].ids.map(id => ({
                    src: `/api/image/${id}`,
                }))}
              />
            </div>
        </Center>
        </Modal>
        )}
      </ModalGateway>
</ChakraProvider>
  );
}

export default App;
