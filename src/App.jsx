import React, { useState, useEffect, useRef, useCallback } from 'react';
// Import Heroicons for a sleek look
import { XMarkIcon, ArrowUturnLeftIcon, PlayIcon, SparklesIcon, CheckCircleIcon, ExclamationCircleIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // Outline style for minimalist look

// --- General UI Styling Classes (Defined outside App component for consistent scope) ---
const APP_CONTAINER_CLASSES = `
  min-h-screen bg-black text-white font-rajdhani flex flex-col items-center justify-start p-4
  relative overflow-hidden transition-colors duration-300 ease-in-out
`;

const CARD_CLASSES = `
  bg-white/5 backdrop-blur-xl p-8 rounded-lg shadow-2xl ring-1 ring-inset ring-white/10
  max-w-md w-full mx-auto my-4
`;

const BUTTON_CLASSES = `
  w-full py-3 px-6 rounded-lg font-bold text-lg transition-all duration-300
  focus:outline-none focus:ring-1 focus:ring-offset-0
  shadow-lg hover:shadow-xl
`;

// AuraSync specific color styles
const PRIMARY_RED_CLASSES = 'bg-rose-800 hover:bg-rose-900 focus:ring-rose-700 focus:ring-offset-black'; // Darker red
const SECONDARY_YELLOW_CLASSES = 'bg-amber-100 text-black hover:bg-amber-200 focus:ring-amber-300 focus:ring-offset-black';
const ACCENT_BLACK_CLASSES = 'bg-black text-rose-500 hover:bg-gray-900 focus:ring-gray-700 focus:ring-offset-black border-2 border-rose-700'; // Sharper border

const INPUT_CLASSES = `
  w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white
  focus:outline-none focus:ring-2 focus:ring-rose-600
`;

// --- Data for Scenes and Genres (Moved outside App component to be static) ---
const SCENES = [
  { name: 'Workout', image: 'https://placehold.co/800x1200/B91C1C/FFF?text=WORKOUT+VIBE', defaultGenres: ['Heavy Metal', 'EDM', 'Hip-Hop', 'Pop Punk', 'Trance'] },
  { name: 'Calm', image: 'https://placehold.co/800x1200/1E3A8A/FFF?text=CALM+FLOW', defaultGenres: ['Ambient', 'Acoustic', 'Lo-Fi', 'Classical', 'Jazz'] },
  { name: 'Chill', image: 'https://placehold.co/800x1200/064E3B/FFF?text=CHILL+BEATS', defaultGenres: ['Indie Pop', 'R&B', 'Downtempo', 'Reggae', 'Soul'] },
  { name: 'Focus', image: 'https://placehold.co/800x1200/4F46E5/FFF?text=FOCUS+ZONE', defaultGenres: ['Instrumental', 'Classical', 'Minimal Techno', 'Ambient', 'Soundtrack'] },
  { name: 'Party', image: 'https://placehold.co/800x1200/BE185D/FFF?text=PARTY+ANIMAL', defaultGenres: ['Dance Pop', 'House', 'Disco', 'Latin Pop', 'Funk'] },
  { name: 'Dream', image: 'https://placehold.co/800x1200/7C3AEDA/FFF?text=DREAMSCAPE', defaultGenres: ['Dream Pop', 'Shoegaze', 'Ambient', 'Electronic', 'New Age'] },
  { name: 'Travel', image: 'https://placehold.co/800x1200/059669/FFF?text=ROAD+TRIP', defaultGenres: ['Indie Folk', 'Alternative Rock', 'Pop', 'Country', 'Blues'] },
  { name: 'Gaming', image: 'https://placehold.co/800x1200/4F46E5/FFF?text=GAMING+SOUNDS', defaultGenres: ['Electronic', 'Soundtrack', 'Chiptune', 'Dubstep', 'Rock'] },
];


// Main App component
const App = () => {
  // --- Spotify API Configuration ---
  const SPOTIFY_CLIENT_ID = '22d8e96433ca47ffb6ed1a36db60adad'; // Your Spotify Client ID
  // Redirect URI for Spotify OAuth Implicit Grant Flow (MUST match Spotify Dashboard setting)
  // Dynamically set based on current origin for Vercel deployment flexibility
  const SPOTIFY_REDIRECT_URI = window.location.origin; 

  const SPOTIFY_SCOPES = [
    'user-read-private',
    'user-top-read',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-recently-played',
    'user-library-read'
  ].join(' ');

  // --- State Management ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
  const [spotifyUserId, setSpotifyUserId] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState(null);
  const [userProfileImage, setUserProfileImage] = useState(null);
  const [screen, setScreen] = useState('welcome'); // 'welcome', 'scene-selection', 'genre-selection', 'playlist-display'
  
  // Initialize selectedScene directly with a stable reference
  const [selectedScene, setSelectedScene] = useState(SCENES[0]); 

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [customMood, setCustomMood] = useState('');
  const [discoveryPreference, setDiscoveryPreference] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [playlistName, setPlaylistName] = useState('');

  // Custom Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');
  const [showUserMenu, setShowUserMenu] = useState(false); // State for user profile dropdown

  // --- Card Swiping/Scrolling State ---
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentTranslateX, setCurrentTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardContainerRef = useRef(null); // Ref for the container to get its width for swipe threshold

  // Detect if device is touch-enabled
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;


  // Update selected scene when currentCardIndex changes
  useEffect(() => {
    setSelectedScene(SCENES[currentCardIndex]);
    setSelectedGenres([]); // Reset genres when scene changes
  }, [currentCardIndex]); // SCENES is now a static dependency, so it's removed from here

  // --- Utility Functions ---
  const showCustomModal = useCallback((message, type = 'success') => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  }, []);

  const closeCustomModal = useCallback(() => {
    setShowModal(false);
    setModalMessage('');
  }, []);

  // Function to generate a random string for PKCE
  const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) { // CORRECTED LOOP CONDITION
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  // Function to base64url encode a buffer
  const base64urlencode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  // Function to generate a code challenge from a code verifier
  const generateCodeChallenge = async (codeVerifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64urlencode(digest);
  };


  // --- Spotify API Calls (These functions need to be defined before they are used in useEffect) ---
  const getSpotifyUserProfile = useCallback(async (token) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(`Spotify API error: ${response.statusText} - ${response.status} - ${errorData.error_description || errorData.error}`);
        } else {
            const errorText = await response.text();
            throw new Error(`Spotify API error (Non-JSON response): ${response.statusText} - ${response.status} - Raw: ${errorText.substring(0, 200)}...`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Spotify user profile:', error);
      showCustomModal(`Failed to fetch Spotify profile: ${error.message}. Is your access token valid?`, 'error');
      throw error;
    }
  }, [showCustomModal]);

  const getSpotifyUserTopItems = useCallback(async (token, type = 'artists', limit = 5) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(`Spotify API error: ${response.statusText} - ${response.status} - ${errorData.error_description || errorData.error}`);
        } else {
            const errorText = await response.text();
            throw new Error(`Spotify API error (Non-JSON response): ${response.statusText} - ${response.status} - Raw: ${errorText.substring(0, 200)}...`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching Spotify top ${type}:`, error);
      showCustomModal(`Failed to fetch Spotify top ${type}: ${error.message}. Is your access token valid?`, 'error');
      return { items: [] };
    }
  }, [showCustomModal]);

  const getSpotifyRecommendations = useCallback(async (token, seedArtists, seedGenres, seedTracks, targetPopularity, limit = 20) => {
    const queryParams = new URLSearchParams();
    if (seedArtists.length > 0) queryParams.append('seed_artists', seedArtists.join(','));
    if (seedGenres.length > 0) queryParams.append('seed_genres', seedGenres.join(','));
    if (seedTracks.length > 0) queryParams.append('seed_tracks', seedTracks.join(','));
    queryParams.append('limit', limit);
    queryParams.append('target_popularity', targetPopularity);

    try {
      const response = await fetch(`https://api.spotify.com/v1/recommendations?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(`Spotify API error: ${response.statusText} - ${response.status} - ${errorData.error_description || errorData.error}`);
        } else {
            const errorText = await response.text();
            throw new Error(`Spotify API error (Non-JSON response): ${response.statusText} - ${response.status} - Raw: ${errorText.substring(0, 200)}...`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Spotify recommendations:', error);
      showCustomModal(`Failed to fetch Spotify recommendations: ${error.message}. Check console for details.`, 'error');
      throw error;
    }
  }, [showCustomModal]);

  const createSpotifyPlaylist = useCallback(async (token, userId, name, description, isPublic = false) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          description: description,
          public: isPublic
        })
      });
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(`Spotify API error: ${response.statusText} - ${response.status} - ${errorData.error_description || errorData.error}`);
        } else {
            const errorText = await response.text();
            throw new Error(`Spotify API error (Non-JSON response): ${response.statusText} - ${response.status} - Raw: ${errorText.substring(0, 200)}...`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating Spotify playlist:', error);
      showCustomModal(`Failed to create Spotify playlist: ${error.message}. Check console for details.`, 'error');
      throw error;
    }
  }, [showCustomModal]);

  const addTracksToPlaylist = useCallback(async (token, playlistId, trackUris) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: trackUris
        })
      });
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(`Spotify API error: ${response.statusText} - ${response.status} - ${errorData.error_description || errorData.error}`);
        } else {
            const errorText = await response.text();
            throw new Error(`Spotify API error (Non-JSON response): ${response.statusText} - ${response.status} - Raw: ${errorText.substring(0, 200)}...`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      showCustomModal(`Failed to add tracks to playlist: ${error.message}. Check console for details.`, 'error');
      throw error;
    }
  }, [showCustomModal]);


  // --- Spotify Authentication Logic (Authorization Code Flow with PKCE) ---
  const handleSpotifyConnect = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Initiating Spotify Connection...');

    try {
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      sessionStorage.setItem('spotify_code_verifier', codeVerifier);

      const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${SPOTIFY_CLIENT_ID}` +
        `&response_type=code` + // Requesting authorization code
        `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(SPOTIFY_SCOPES)}` +
        `&code_challenge_method=S256` + // PKCE method
        `&code_challenge=${codeChallenge}`;
      
      window.location.href = authUrl; // Redirect user to Spotify for authorization
    } catch (error) {
      console.error('Error initiating Spotify login:', error);
      showCustomModal(`Failed to initiate Spotify login: ${error.message}. Please try again.`, 'error');
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [setIsLoading, setLoadingMessage, showCustomModal, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES]);

  // Effect to handle Spotify OAuth callback (PKCE)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    // Only proceed if there's a code or an error in the URL parameters
    if (code || error) {
      const handleSpotifyCallback = async () => {
        console.log('--- Spotify Callback Handler Initiated ---');
        console.log('window.location.search:', window.location.search);
        console.log('Extracted code:', code ? 'Code present' : 'Code missing');
        console.log('Extracted error:', error || 'No error');

        // Clear URL parameters AFTER reading them
        window.history.replaceState({}, document.title, window.location.pathname); 

        if (error) {
          console.error('Spotify Auth Error (URL parameter):', error);
          showCustomModal(`Spotify authentication failed: ${error}. Please try again.`, 'error');
          setIsAuthenticated(false);
          setScreen('welcome');
          sessionStorage.removeItem('spotify_code_verifier'); // Clean up
          return;
        }

        if (code) {
          const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
          if (!codeVerifier) {
            console.error('Spotify Auth Error: No code_verifier found in session storage.');
            showCustomModal('Spotify authentication failed: Missing security credentials. Please try again.', 'error');
            setIsAuthenticated(false);
            setScreen('welcome');
            return;
          }

          setLoadingMessage('Exchanging authorization code...');
          setIsLoading(true);

          try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                client_id: SPOTIFY_CLIENT_ID,
                code_verifier: codeVerifier,
              }).toString(),
            });

            if (!response.ok) {
              const contentType = response.headers.get('Content-Type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(`Token exchange failed: ${response.statusText} - ${response.status} - ${errorData.error_description || errorData.error}`);
                } else {
                    const errorText = await response.text();
                    throw new Error(`Token exchange failed (Non-JSON response): ${response.statusText} - ${response.status} - Raw: ${errorText.substring(0, 200)}...`);
                }
            }

            const data = await response.json();
            setSpotifyAccessToken(data.access_token);
            setIsAuthenticated(true);
            console.log('Spotify Access Token received (PKCE)!');

            // Fetch user profile
            const userProfile = await getSpotifyUserProfile(data.access_token);
            if (userProfile && userProfile.id) {
              setSpotifyUserId(userProfile.id);
              setUserDisplayName(userProfile.display_name || 'Spotify User');
              setUserProfileImage(userProfile.images?.[0]?.url || null);
              console.log('Spotify User ID:', userProfile.id);
              setScreen('scene-selection');
            } else {
              throw new Error('Could not retrieve Spotify user ID from profile data.');
            }

          } catch (err) {
            console.error('Error during token exchange or profile fetch:', err);
            showCustomModal(`Spotify login failed: ${err.message}. Please try again.`, 'error');
            setIsAuthenticated(false);
            setScreen('welcome');
          } finally {
            setIsLoading(false);
            setLoadingMessage('');
            sessionStorage.removeItem('spotify_code_verifier'); // Clean up
          }
        }
      };
      handleSpotifyCallback();
    }
  }, [getSpotifyUserProfile, showCustomModal, setIsLoading, setIsAuthenticated, setScreen, setLoadingMessage, setSpotifyAccessToken, setSpotifyUserId, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI]);


  // --- Card Swiping/Scrolling Logic ---
  const onTouchStart = useCallback((e) => {
    if (!isTouchDevice) return; // Only enable swipe on touch devices
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  }, [isTouchDevice]);

  const onTouchMove = useCallback((e) => {
    if (!isDragging || !isTouchDevice) return; // Only enable swipe on touch devices
    const currentX = e.touches[0].clientX;
    setCurrentTranslateX(currentX - startX);
  }, [isDragging, startX, isTouchDevice]);

  const onTouchEnd = useCallback(() => {
    if (!isTouchDevice) return; // Only enable swipe on touch devices
    setIsDragging(false);
    if (cardContainerRef.current) {
      // Reduced threshold for easier swiping
      const threshold = cardContainerRef.current.offsetWidth / 5; 

      if (currentTranslateX < -threshold) {
        // Swiped left (next card)
        setCurrentCardIndex(prevIndex => (prevIndex + 1) % SCENES.length);
      } else if (currentTranslateX > threshold) {
        // Swiped right (previous card)
        setCurrentCardIndex(prevIndex => (prevIndex - 1 + SCENES.length) % SCENES.length);
      }
    }
    setCurrentTranslateX(0); // Reset translation
  }, [currentTranslateX, SCENES.length, isTouchDevice]);

  // Handle scroll for non-touch devices
  const handleScroll = useCallback(() => {
    if (isTouchDevice || !cardContainerRef.current) return;
    const container = cardContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = 250 + 20; // Card width + margin-right
    const newIndex = Math.round(scrollLeft / cardWidth);
    if (newIndex !== currentCardIndex) {
      setCurrentCardIndex(newIndex);
    }
  }, [isTouchDevice, currentCardIndex]);


  // --- Gemini API Call ---
  const callGeminiAPI = useCallback(async (userMood, selectedGenres, topArtists, topTracks) => {
    setLoadingMessage('Consulting the Aura AI...');
    const prompt = `
      You are an AI music curator for a GenZ audience. Based on the user's input, suggest a creative, GenZ-cool, and subtle western techno-vibes playlist name. Also, suggest relevant Spotify seed genres (up to 3) and seed artist IDs (up to 2).
      The user will describe their mood and the *situation*. Interpret this holistically.

      User's selected scene: ${selectedScene?.name || 'N/A'}
      User's selected genres: ${selectedGenres.length > 0 ? selectedGenres.join(', ') : 'None'}
      User's detailed situation/mood description: "${userMood || 'None'}"
      User's top artists (for taste reference): ${topArtists.length > 0 ? topArtists.map(a => a.name).join(', ') : 'None'}
      User's top tracks (for taste reference): ${topTracks.length > 0 ? topTracks.map(t => t.name).join(', ') : 'None'}

      Provide your response as a JSON object with the following structure:
      {
        "playlistNameSuggestion": "Your suggested playlist name",
        "spotifySeedGenres": ["genre_id_1", "genre_id_2"],
        "spotifySeedArtists": ["artist_id_1", "artist_id_2"]
      }
      `;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "playlistNameSuggestion": { "type": "STRING" },
                    "spotifySeedGenres": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "spotifySeedArtists": { "type": "ARRAY", "items": { "type": "STRING" } }
                },
                "propertyOrdering": ["playlistNameSuggestion", "spotifySeedGenres", "spotifySeedArtists"]
            }
        }
    };
    // The apiKey is expected to be provided by the Canvas environment.
    // If you are running this outside of Canvas and need to provide a key,
    // replace `""` with your actual Gemini API key.
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const contentType = response.headers.get('Content-Type');
        if (!response.ok || !(contentType && contentType.includes('application/json'))) {
            const errorText = await response.text();
            console.error("Gemini API returned an unexpected status or non-JSON content:", response.status, errorText.substring(0, 500));
            throw new Error(`Gemini API call failed: ${response.statusText} - Raw: ${errorText.substring(0, 200)}...`);
        }

        const result = await response.json(); // Attempt to parse JSON
        
        // Check if the response structure is as expected
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            console.log("Gemini Raw Response (parsed):", jsonString);
            return JSON.parse(jsonString);
        } else {
            console.error("Gemini API returned an unexpected structure or no content:", JSON.stringify(result, null, 2));
            throw new Error("Gemini API returned an unexpected structure or no content.");
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        showCustomModal('Failed to get AI recommendations. Please try again.', 'error');
        throw error;
    }
  }, [selectedScene, showCustomModal, setLoadingMessage]);


  // --- Main Playlist Generation Flow ---
  const handleGeneratePlaylist = useCallback(async () => {
    if (!spotifyAccessToken || !spotifyUserId) {
      showCustomModal('Spotify is not connected. Please try again.', 'error');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Gathering your Spotify data...');
    try {
      // 1. Get user's top artists and tracks from Spotify
      const topArtistsData = await getSpotifyUserTopItems(spotifyAccessToken, 'artists', 5);
      const topTracksData = await getSpotifyUserTopItems(spotifyAccessToken, 'tracks', 5);
      const userTopArtistIds = topArtistsData.items.map(artist => artist.id);
      const userTopTrackIds = topTracksData.items.map(track => track.id);
      const userTopGenres = topArtistsData.items.flatMap(artist => artist.genres);

      // Combine user's selected genres with top genres for Gemini
      const combinedGenres = [...new Set([...selectedGenres, ...userTopGenres])].slice(0, 5);

      // 2. Call Gemini API for smart recommendations and playlist name
      const geminiResult = await callGeminiAPI(customMood, combinedGenres, topArtistsData.items, topTracksData.items);
      const { playlistNameSuggestion, spotifySeedGenres, spotifySeedArtists } = geminiResult;

      setPlaylistName(playlistNameSuggestion || `${selectedScene?.name || 'AuraSync'} Mix`);

      // Prepare seeds for Spotify recommendations
      let finalSeedArtists = spotifySeedArtists.slice(0, 2);
      let finalSeedGenres = spotifySeedGenres.slice(0, 3);
      let finalSeedTracks = [];

      // Ensure we always have at least one seed type if possible
      if (finalSeedArtists.length === 0 && userTopArtistIds.length > 0) {
        finalSeedArtists = userTopArtistIds.slice(0, 2);
      }
      if (finalSeedGenres.length === 0 && userTopGenres.length > 0) {
        finalSeedGenres = userTopGenres.slice(0, 3);
      }
      if (finalSeedTracks.length === 0 && userTopTrackIds.length > 0) {
          finalSeedTracks = userTopTrackIds.slice(0, 5);
      }

      // Fallback if no seeds could be generated from user data or Gemini
      if (finalSeedArtists.length === 0 && finalSeedGenres.length === 0 && finalSeedTracks.length === 0) {
        finalSeedGenres = ['pop', 'dance', 'electronic']; // Default to generic genres
        console.warn('No specific seeds generated from user data or Gemini. Using generic genres for recommendations.');
      }

      setLoadingMessage('Fetching Spotify recommendations...');
      const targetPopularity = 100 - discoveryPreference;

      const recommendations = await getSpotifyRecommendations(
        spotifyAccessToken,
        finalSeedArtists,
        finalSeedGenres,
        finalSeedTracks,
        targetPopularity,
        20
      );

      const curatedTracks = recommendations.tracks.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        albumArt: track.album.images[0]?.url || 'https://placehold.co/60x60/000/FFF?text=NA',
        uri: track.uri,
        isNew: !userTopTrackIds.includes(track.id)
      }));

      setPlaylist(curatedTracks);
      setScreen('playlist-display');

    } catch (error) {
      console.error('Error during playlist generation:', error);
      showCustomModal(`Failed to generate playlist: ${error.message}`, 'error');
      setPlaylist([]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [spotifyAccessToken, spotifyUserId, selectedScene, selectedGenres, customMood, discoveryPreference, showCustomModal, setIsLoading, setLoadingMessage, setPlaylistName, setPlaylist, setScreen, getSpotifyUserTopItems, callGeminiAPI, getSpotifyRecommendations]);

  const handleSaveToSpotify = useCallback(async () => {
    if (!spotifyAccessToken || !spotifyUserId || playlist.length === 0) {
      showCustomModal('No playlist to save or not connected to Spotify.', 'error');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Saving playlist to Spotify...');
    try {
      const newPlaylist = await createSpotifyPlaylist(
        spotifyAccessToken,
        spotifyUserId,
        playlistName,
        `AuraSync playlist for your ${selectedScene?.name || 'custom'} vibe.`
      );

      const trackUris = playlist.map(track => track.uri);
      await addTracksToPlaylist(spotifyAccessToken, newPlaylist.id, trackUris);

      showCustomModal('Playlist saved to Spotify successfully!', 'success');
      console.log('Playlist saved:', newPlaylist.external_urls.spotify);
    } catch (error) {
      console.error('Error saving playlist to Spotify:', error);
      showCustomModal(`Failed to save playlist: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [spotifyAccessToken, spotifyUserId, playlist, playlistName, selectedScene, showCustomModal, setIsLoading, setLoadingMessage, createSpotifyPlaylist, addTracksToPlaylist]);

  const handleSelectScene = useCallback(() => {
    // This function is now called when the user explicitly clicks "Select This Scene"
    // The selectedScene is already updated by the useEffect tied to currentCardIndex
    setScreen('genre-selection');
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setSpotifyAccessToken(null);
    setSpotifyUserId(null);
    setUserDisplayName(null);
    setUserProfileImage(null);
    setScreen('welcome');
    setPlaylist([]);
    setPlaylistName('');
    setSelectedGenres([]);
    setCustomMood('');
    setDiscoveryPreference(50);
    showCustomModal('Logged out from Spotify.', 'success');
  }, [showCustomModal]);


  // --- Render Logic ---
  return (
    <div className={APP_CONTAINER_CLASSES} style={{
      backgroundImage: screen === 'welcome' 
        ? 'radial-gradient(circle at center, rgba(30,0,50,0.8) 0%, rgba(0,0,0,1) 70%)'
        : (selectedScene ? `url(${selectedScene.image})` : 'none'),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transition: 'background-image 0.3s ease-in-out', // Faster background transition
    }}>
      {/* Dynamic Background Overlay */}
      {screen !== 'welcome' && selectedScene && (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-0 transition-opacity duration-500 ease-in-out"></div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-rose-500"></div>
            <p className="mt-4 text-xl text-gray-300">{loadingMessage || 'Loading...'}</p>
          </div>
        </div>
      )}

      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-700 text-center max-w-sm w-full">
            {modalType === 'success' ? (
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <p className="text-lg text-gray-200 mb-6">{modalMessage}</p>
            <button
              onClick={closeCustomModal}
              className={`${BUTTON_CLASSES} ${modalType === 'success' ? PRIMARY_RED_CLASSES : ACCENT_BLACK_CLASSES}`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* User Profile Icon and Dropdown */}
      {isAuthenticated && screen !== 'welcome' && (
        <div className="absolute top-4 right-4 z-30">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            title="User Menu"
          >
            {userProfileImage ? (
              <img src={userProfileImage} alt="User Profile" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <UserCircleIcon className="h-8 w-8 text-gray-300" />
            )}
            <span className="text-gray-200 text-sm font-semibold hidden sm:inline">{userDisplayName}</span>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Welcome Screen --- */}
      {screen === 'welcome' && (
        <div className={`fixed inset-0 flex items-center justify-center p-4 z-10`}> {/* Full screen centering */}
            <div className={`${CARD_CLASSES} max-w-md w-full my-auto`}> {/* Use my-auto for vertical centering */}
                <h1 className="text-5xl font-extrabold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-200 font-rajdhani">
                    AuraSync
                </h1>
                <p className="text-center text-gray-300 mb-8 text-lg font-rajdhani">
                    Unleash Your Perfect Vibe. Curated Soundscapes for Every Moment.
                </p>
                <button
                    onClick={handleSpotifyConnect}
                    className={`${BUTTON_CLASSES} bg-spotifyGreen hover:bg-green-600 focus:ring-green-500 flex items-center justify-center space-x-2`}
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.9 10.9C14.7 9 9.3 8.7 6.1 10.6c-.4.2-.9 0-1.1-.4-.2-.4 0-.9.4-1.1 3.8-2.2 9.7-1.9 13.9.4.4.2.6.7.4 1.1-.2.4-.7.6-1.1.4zm-.9 3.1c-2.8-1.6-7-1.4-9.7.2-.3.2-.8 0-1-.3-.2-.3 0-.8.3-1 3.2-1.8 7.6-2 10.1-.5.3.2.4.7.2 1-.2.3-.7.4-1 .2zm-1.1 3.1c-2.3-1.3-4.8-1.2-7.1-.1-.3.1-.7 0-.8-.3-.1-.3 0-.7.3-.8 2.6-1.4 5.4-1.5 8-.1.3.2.4.6.2.9-.2.3-.6.4-.9.2zM12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0z" />
                    </svg>
                    <span>Connect with Spotify</span>
                </button>
            </div>
        </div>
      )}

      {/* --- Scene Selection Screen --- */}
      {screen === 'scene-selection' && (
        <div className="flex flex-col items-center justify-center w-full h-full relative z-10 p-4 pt-16 pb-8"> {/* Added pt-16 pb-8 for header/footer spacing */}
          <h2 className="text-4xl font-bold text-center mb-8 text-gray-100 drop-shadow-lg">
            Set Your Scene.
          </h2>

          {/* Scene Cards Container (Swiping/Scrolling) */}
          <div
            ref={cardContainerRef}
            className={`relative w-full max-w-sm h-[400px] flex items-center justify-center
              ${isTouchDevice ? 'overflow-hidden' : 'overflow-x-auto whitespace-nowrap scrollbar-hide'}`} /* Conditional classes */
            onScroll={isTouchDevice ? undefined : handleScroll} /* Only for non-touch devices */
          >
            {SCENES.map((scene, index) => {
              const isActive = index === currentCardIndex;
              const offset = index - currentCardIndex;

              const transformStyle = isTouchDevice ? {
                // Touch device: stacking and swiping
                transform: `translateX(calc(-50% + ${currentTranslateX}px)) scale(${1 - Math.abs(offset) * 0.05})`,
                opacity: 1 - Math.abs(offset) * 0.1,
                zIndex: 100 - Math.abs(offset),
                transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
                left: '50%',
                position: 'absolute', // Keep absolute for stacking
              } : {
                // Non-touch device: horizontal layout, no stacking
                transform: `scale(${isActive ? 1.2 : 1})`, // Scale active card
                transition: 'transform 0.2s ease-out',
                display: 'inline-block', // For horizontal alignment
                marginRight: '20px', // Spacing between cards
                flexShrink: 0, // Prevent shrinking in flex container
                verticalAlign: 'middle', // Align cards vertically in the middle of the flex item
              };

              return (
                <div
                  key={scene.name}
                  className={`
                    w-[250px] h-[350px] rounded-lg overflow-hidden
                    shadow-xl shadow-black/50 border-2 border-rose-600
                    flex flex-col justify-end items-center p-4
                    cursor-grab select-none
                  `}
                  style={transformStyle}
                  // Conditionally apply touch handlers only to the currently active card on touch devices
                  {...(isTouchDevice && isActive ? { onTouchStart, onTouchMove, onTouchEnd } : {})}
                >
                  <img
                    src={scene.image}
                    alt={scene.name}
                    className="w-full h-full object-cover absolute inset-0 rounded-lg"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/800x1200/333/FFF?text=SCENE'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 rounded-lg flex items-end p-4">
                    <h3 className="text-4xl font-bold text-white drop-shadow-lg">{scene.name}</h3>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-gray-400 text-sm mt-4 mb-8">
            {isTouchDevice ? 'Swipe cards to find your perfect scene.' : 'Scroll cards to find your perfect scene.'}
          </p>
          <button
            onClick={handleSelectScene}
            className={`${BUTTON_CLASSES} ${PRIMARY_RED_CLASSES}`}
          >
            Select This Scene
          </button>
        </div>
      )}

      {/* --- Genre Selection Screen --- */}
      {screen === 'genre-selection' && selectedScene && (
        <div className={`flex flex-col items-center justify-center w-full h-full relative z-10 p-4 pt-16 pb-8`}> {/* Full screen, vertically centered */}
          {/* Top Navigation */}
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setScreen('scene-selection')}
              className={`p-2 rounded-full ${ACCENT_BLACK_CLASSES} focus:ring-rose-500`}
              title="Back to Scenes"
            >
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </button>
          </div>

          <div className={`${CARD_CLASSES} flex flex-col items-center justify-center`}> {/* Card content */}
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-100">
              What's Your Flavor for <span className="text-rose-400">{selectedScene.name}</span>?
            </h2>

            {/* Genre Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {selectedScene.defaultGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenres(prev =>
                    prev.includes(genre)
                      ? prev.filter(g => g !== genre)
                      : [...prev, genre]
                  )}
                  className={`
                    py-2 px-4 rounded-full text-sm font-semibold transition-all duration-200
                    border-2
                    ${selectedGenres.includes(genre)
                      ? `${PRIMARY_RED_CLASSES} text-white border-rose-600 shadow-lg`
                      : `${SECONDARY_YELLOW_CLASSES} text-black border-amber-300 shadow-md`
                    }
                  `}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Custom Mood Input */}
            <div className="mb-6 w-full">
              <label htmlFor="custom-mood" className="block text-gray-300 text-sm font-medium mb-2">
                Or describe your unique situation...
              </label>
              <textarea
                id="custom-mood"
                rows="3"
                className={`${INPUT_CLASSES} resize-none`}
                placeholder="Describe your unique situation, how long it lasts, what changes, and what kind of music you need throughout..."
                value={customMood}
                onChange={(e) => setCustomMood(e.target.value)}
              ></textarea>
            </div>

            {/* Discovery Slider */}
            <div className="mb-8 w-full">
              <label htmlFor="discovery-slider" className="block text-gray-300 text-sm font-medium mb-2">
                Discovery Preference: <span className="font-bold text-rose-300">{discoveryPreference}% New Beats</span>
              </label>
              <input
                id="discovery-slider"
                type="range"
                min="0"
                max="100"
                value={discoveryPreference}
                onChange={(e) => setDiscoveryPreference(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Familiar</span>
                <span>New Beats</span>
              </div>
            </div>

            {/* Generate Playlist Button */}
            <button
              onClick={handleGeneratePlaylist}
              className={`${BUTTON_CLASSES} ${PRIMARY_RED_CLASSES} ${selectedGenres.length === 0 && !customMood ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
              disabled={selectedGenres.length === 0 && !customMood}
            >
              Forge My Aura
            </button>
          </div>
        </div>
      )}

      {/* --- Playlist Display Screen --- */}
      {screen === 'playlist-display' && (
        <div className={`flex flex-col items-center justify-center w-full h-full relative z-10 p-4 pt-16 pb-8`}> {/* Full screen, vertically centered */}
          {/* Top Navigation */}
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setScreen('genre-selection')} // Go back to main curation screen
              className={`p-2 rounded-full ${ACCENT_BLACK_CLASSES} focus:ring-rose-500`}
              title="Back to Curation"
            >
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </button>
          </div>
          {/* Logout button is now in the User Profile dropdown */}

          <div className={`${CARD_CLASSES} min-h-[60vh] flex flex-col`}> {/* Card content */}
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-100">
              {playlistName || `AuraSync: Your ${selectedScene?.name || 'Custom'} Pulse`}
            </h2>

            {/* Playlist Hero Section */}
            <div className="relative w-48 h-48 mx-auto mb-6 rounded-xl overflow-hidden shadow-xl border-2 border-rose-600">
              <img
                src={playlist[0]?.albumArt || 'https://placehold.co/192x192/000/FFF?text=AuraSync'}
                alt="Playlist Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <button className="p-3 rounded-full bg-rose-600 text-white shadow-lg">
                  <PlayIcon className="h-8 w-8" />
                </button>
              </div>
            </div>

            <div className="flex-grow max-h-80 overflow-y-auto mb-6 pr-2 scrollbar-hide">
              {playlist.map((song) => (
                <div key={song.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-900 transition-colors duration-200 mb-2 border border-gray-800">
                  <img src={song.albumArt} alt="Album Art" className="w-14 h-14 rounded-md shadow-sm" />
                  <div className="flex-grow">
                    <p className="text-lg font-semibold text-gray-100">{song.title}</p>
                    <p className="text-sm text-gray-400">{song.artist}</p>
                  </div>
                  {song.isNew && (
                    <SparklesIcon className="h-5 w-5 text-amber-300" title="New Discovery" />
                  )}
                  <button className="text-rose-400 hover:text-rose-300 transition-colors duration-200">
                    <PlayIcon className="h-6 w-6" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 mt-auto"> {/* mt-auto pushes buttons to bottom */}
              <button
                onClick={handleSaveToSpotify}
                className={`${BUTTON_CLASSES} ${PRIMARY_RED_CLASSES}`}
              >
                Save to Spotify
              </button>
              <button
                onClick={() => setScreen('genre-selection')} // Go back to main curation for refinement
                className={`${BUTTON_CLASSES} ${ACCENT_BLACK_CLASSES}`}
              >
                Refine Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Text at the very bottom of the app */}
      {screen === 'welcome' && (
        <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs z-10">v1.4</p>
      )}
    </div>
  );
};

export default App;
