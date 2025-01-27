package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Mock FetchArtists function for testing
func mockFetchArtists(artists *[]Artist) error {
	*artists = []Artist{
		{
			ID:           1,
			Name:         "Test Artist",
			Image:        "test_image.jpg",
			Members:      []string{"Member 1", "Member 2"},
			CreationDate: 2000,
			FirstAlbum:   "2001",
			Locations:    []string{"Location 1", "Location 2"},
			Dates:        []string{"01-01-2023", "02-01-2023"},
			Relation: map[string]string{
				"Location 1": "01-01-2023",
				"Location 2": "02-01-2023",
			},
		},
	}
	return nil
}

func TestServeHome(t *testing.T) {
	// Mock FetchArtists
	originalFetchArtists := FetchArtists
	defer func() { FetchArtists = originalFetchArtists }()
	FetchArtists = mockFetchArtists

	// Create the test request
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	// Call the handler
	serveHome(w, req)

	// Get the response
	res := w.Result()
	defer res.Body.Close()

	// Check the HTTP status code
	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", res.StatusCode)
	}

	// Get the response body as a string
	body := w.Body.String()

	// Validate artist data rendering
	expectedArtist := "Test Artist"
	if !strings.Contains(body, expectedArtist) {
		t.Errorf("Expected response body to contain %q, but it didn't. Full response:\n%v", expectedArtist, body)
	}
}

func TestServeHomeNotFound(t *testing.T) {
	// Create a request for a non-existent path
	req := httptest.NewRequest(http.MethodGet, "/non-existent-path", nil)
	w := httptest.NewRecorder()

	// Call the handler
	serveHome(w, req)

	// Get the response
	res := w.Result()
	defer res.Body.Close()

	// Check that the response includes content from "templates/error.html"
	body := w.Body.String()

	// Look for a unique part of the error.html file to verify it's served correctly
	expectedSnippet := `<title>404 ERROR</title>` // Or any other unique content in your error.html file
	if !strings.Contains(body, expectedSnippet) {
		t.Errorf("Expected response body to contain %q, but it didn't. Full response:\n%v", expectedSnippet, body)
	}

	// Check the HTTP status code (optional; should remain 200 for `ServeFile`)
	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status code 200, got %v", res.StatusCode)
	}
}

func TestGeolocalizationHandler(t *testing.T) {
	// Mock FetchArtists
	originalFetchArtists := FetchArtists
	defer func() { FetchArtists = originalFetchArtists }()
	FetchArtists = mockFetchArtists

	req := httptest.NewRequest(http.MethodGet, "/geolocalization?q=Location+1", nil)
	w := httptest.NewRecorder()

	geolocalizationHandler(w, req)

	res := w.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", res.StatusCode)
	}

	// Check for geolocation data in the response
	var response []map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("Error decoding response: %v", err)
	}

	if len(response) == 0 {
		t.Errorf("Expected geolocalization data, but got none.")
	}
}

func TestSearchHandler(t *testing.T) {
	// Mock FetchArtists
	originalFetchArtists := FetchArtists
	defer func() { FetchArtists = originalFetchArtists }()
	FetchArtists = mockFetchArtists

	req := httptest.NewRequest(http.MethodGet, "/search?q=test", nil)
	w := httptest.NewRecorder()

	searchHandler(w, req)

	res := w.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", res.StatusCode)
	}

	// Check for search results in the response
	var results []string
	if err := json.NewDecoder(res.Body).Decode(&results); err != nil {
		t.Fatalf("Error decoding response: %v", err)
	}

	if len(results) == 0 {
		t.Errorf("Expected search results, but got none.")
	}

	// Ensure the mocked artist is in the results
	expected := "Test Artist"
	found := false
	for _, r := range results {
		if strings.Contains(r, expected) {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected search results to contain %q, but it didn't.", expected)
	}
}

func TestResultHome(t *testing.T) {
	// Mock FetchArtists
	originalFetchArtists := FetchArtists
	defer func() { FetchArtists = originalFetchArtists }()
	FetchArtists = mockFetchArtists

	payload := `{"query": "Test Artist - artist/band"}`
	req := httptest.NewRequest(http.MethodPost, "/result", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	resultHome(w, req)

	res := w.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", res.StatusCode)
	}

	var result Artist
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		t.Fatalf("Error decoding response: %v", err)
	}

	if result.Name != "Test Artist" {
		t.Errorf("Expected artist name 'Test Artist', got %v", result.Name)
	}
}
