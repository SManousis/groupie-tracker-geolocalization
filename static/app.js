// Function to dynamically create cards for each artist
function createCards(artists) {
  const bandContainer = document.getElementById('band-container');
  bandContainer.innerHTML = ''; // Clear any existing content

  artists.forEach((artist) => {
    // Ensure artist has valid data for rendering
    if (!artist.name || !artist.image || !artist.creationDate || !artist.firstAlbum || !artist.members) {
      console.warn(`Missing essential data for artist: ${artist.name}`);
      return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${artist.image}" alt="${artist.name}">
      <div class="name">${artist.name}</div>
      <div class="year">${artist.creationDate}</div>
    `;
    card.addEventListener('click', () =>{
      card.classList.remove('highlight');
      expandCard(artist);
    }); 
    bandContainer.appendChild(card);
  });
}

// Function to expand a card and show artist details
function expandCard(artist) {
  if (!artist.dates || !artist.locations || !artist.events) {
    console.warn(`Incomplete data for artist: ${artist.name}`);
    return;
  }

  // Create an overlay to dim the background
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.addEventListener('click', closeExpandedView);

  // Create the expanded card with the map div added
  const expandedCard = document.createElement('div');
  expandedCard.className = 'expanded-card';
  expandedCard.innerHTML = `
    <div class="sidebar-left" style="background-image: url('${artist.image}');"></div>
    <div class="content">
      <h2>${artist.name}</h2>
      <p><strong>Year of Formation:</strong> ${artist.creationDate}</p>
      <p><strong>First Album:</strong> ${artist.firstAlbum}</p>
      <p><strong>Members:</strong> ${artist.members.join(', ')}</p>
      <h3>Upcoming Events</h3>
      <ul>
        ${Object.entries(artist.events).map(([event, location]) => `<li><strong>${event}:</strong> ${location}</li>`).join('')}
      </ul>
      
      <!-- Map Container Added Here -->
      <h3>Concert Locations</h3>
       <div class="map-container">
        <div id="mapid"></div>
        <button id="connect-btn" class="connect-btn">Connect Locations</button>
      </div>
    </div>
    <div class="sidebar-right" style="background-image: url('${artist.image}');"></div>
    <button class="close-btn">Close</button>
  `;

  // Add close button functionality
  expandedCard.querySelector('.close-btn').addEventListener('click', closeExpandedView);

  // Append overlay and expanded card to the document
  document.body.appendChild(overlay);
  document.body.appendChild(expandedCard);

  // Add animation to expand the card
  setTimeout(() => {
    expandedCard.classList.add('expanded');
    loadMap(artist.name);  // Load map here
  }, 10);
}

// Function to close the expanded view
function closeExpandedView() {
  const overlay = document.querySelector('.overlay');
  const expandedCard = document.querySelector('.expanded-card');
  if (overlay) overlay.remove();
  if (expandedCard) expandedCard.remove();
}

// Modified debounce function to ensure clearing of previous selections and suggestions
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Function to fetch and display search suggestions
function setupSearchBar() {
  const searchInput = document.getElementById('search');
  const suggestionsDisplay = document.querySelector('.search-display');

  // Debounced function to handle the input event
  const fetchSuggestions = debounce(async () => {
    const query = searchInput.value.trim();
  
    // Clear suggestions if input is empty
    if (!query) {
      suggestionsDisplay.innerHTML = '';
      suggestionsDisplay.classList.remove('has-suggestions');
      return;
    }

    // Clear previous search results (suggestions and highlighted cards)
    suggestionsDisplay.innerHTML = '';
    document.querySelectorAll('.card.highlight').forEach(card => {
      card.classList.remove('highlight');
    });
  
    try {
      // Fetch search suggestions from the backend
      const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const suggestions = await response.json();

      // Ensure suggestions is a valid array before proceeding
      if (!Array.isArray(suggestions)) {
        console.warn('Received invalid suggestions:', suggestions);
        return; // Exit if suggestions are not valid
      }
  
      // Limit the number of displayed suggestions (e.g., max 10)
      const limitedSuggestions = suggestions.slice(0, 10);
  
      // Display suggestions dynamically
      if (limitedSuggestions.length > 0) {
        suggestionsDisplay.innerHTML = limitedSuggestions
          .map((suggestion) => `<div class="suggestion">${suggestion}</div>`)
          .join('');
        
        suggestionsDisplay.classList.add('has-suggestions'); // Add border class when suggestions are present
      } else {
        suggestionsDisplay.classList.remove('has-suggestions'); // Remove border if no suggestions
      }
  
      // Check if search was for a location and highlight matching artists
      const locationSuggestions = limitedSuggestions.filter(s => s.includes(' - performing in'));
  
      if (locationSuggestions.length > 0) {
        locationSuggestions.forEach(location => {
          const artistName = location.split(' - ')[0].toLowerCase();
          const cards = document.querySelectorAll('.card');
          cards.forEach(card => {
            const nameElem = card.querySelector('.name');
            if (nameElem && nameElem.textContent.trim().toLowerCase() === artistName) {
              card.classList.add('highlight');
              card.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        });
      }
  
      // Optional: Add click functionality for suggestions
      document.querySelectorAll('.suggestion').forEach((item) => {
        item.addEventListener('click', () => {
          searchInput.value = item.textContent; // Fill input with suggestion
          selectedValue = searchInput.value;
          suggestionsDisplay.innerHTML = ''; // Clear suggestions
          suggestionsDisplay.classList.remove('has-suggestions');
        });
      });
  
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  }, 300); // Adjust the delay (e.g., 300ms)

  // Attach the debounced function to the input event
  searchInput.addEventListener('input', () => {
    selectedValue = ''; // Reset the selected value whenever user starts typing
    fetchSuggestions();
  });

  // Trigger search when pressing "Enter"
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && searchInput.value.trim() !== '') {
      search();
    }
  });
}

function search() {
  if (!selectedValue) {
    alert('Please select or type a valid search term.');
    return;
  }

  fetch('/result', {
    method: 'POST',
    body: JSON.stringify({ query: selectedValue }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("No matching artist found");
      }
      return response.json();
    })
    .then((matchedArtist) => {
      // matchedArtist is the correct band, even if the query was a member or location
      const queryName = matchedArtist.name.toLowerCase();

      // Now scroll to and highlight that band’s card by comparing names
      const cards = document.querySelectorAll('.card');
      let found = false;
      cards.forEach((card) => {
        const nameElem = card.querySelector('.name');
        if (nameElem && nameElem.textContent.trim().toLowerCase() === queryName) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add('highlight');
          found = true;
        }
      });

      if (!found) {
        alert("No matching artist card found on the page.");
      }
    })
    .catch((error) => {
      console.error('Error fetching matched artist:', error);
      alert('No matching artist found.');
    });
}

// Clear the search and reset highlighted cards
function clearText() {
  inputBar.value = '';
  selectedValue = ''; // Reset selected value
  clearBtn.style.display = 'none';
  document.querySelectorAll('.card.highlight').forEach(card => {
    card.classList.remove('highlight');
  });
}

// Event listener for the search button click
document.getElementById('search-btn').addEventListener('click', search);

// Show or hide the clear button based on input
const inputBar = document.getElementById('search');
const clearBtn = document.querySelector('.clear-btn');
inputBar.addEventListener('input', function () {
  if (inputBar.value.trim() !== '') {
    clearBtn.style.display = 'block';
  } else {
    clearBtn.style.display = 'none';
  }
});
let map;
let markers = [];  // Store markers globally
let polyline;      // Store the line

function loadMap(artistName) {
  if (map) {
    map.remove();  // Reset previous map
  }

  fetch(`/geolocalization?q=${encodeURIComponent(artistName)}`)
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`Error ${response.status}: ${text}`);
        });
      }
      return response.json();
    })
    .then(locations => {
      map = L.map('mapid').setView([0, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      markers = [];  // Clear previous markers

      locations.forEach(location => {
        const { lat, lon, location: locName } = location;

        const marker = L.marker([lat, lon])
          .addTo(map)
          .bindPopup(`<b>${locName}</b>`);
        
        markers.push(marker);
      });

      const bounds = locations.map(loc => [loc.lat, loc.lon]);
      if (bounds.length > 0) {
        map.fitBounds(bounds);
      }

      // Add button functionality
      document.getElementById('connect-btn').addEventListener('click', connectLocations);
    })
    .catch(error => {
      console.error('Error loading map locations:', error);
    });
}

// Function to draw a line connecting the locations
function connectLocations() {
  if (polyline) {
    map.removeLayer(polyline);  // Remove existing line if any
  }

  let latlngs = markers.map(marker => marker.getLatLng());

  // Close the loop by connecting the last point to the first
  if (latlngs.length > 2) {
    latlngs.push(latlngs[0]);  // Connect back to the first point
  }

  polyline = L.polyline(latlngs, { color: 'red' }).addTo(map);

  // Zoom the map to fit the connected line
  map.fitBounds(polyline.getBounds());
}

var selectedValue;

// Initialize the app
function init() {
  // artistData is embedded in the HTML by Go
  if (window.artistData && Array.isArray(window.artistData)) {
    createCards(window.artistData);
  } else {
    console.error('Artist data is not available.');
  }
  setupSearchBar();
}

window.onload = function () {
  init();
};
