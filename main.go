package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
)

type LumaEvent struct {
	Name    string `json:"name"`
	StartAt string `json:"start_at"`
	URL     string `json:"url"`
	GeoAddr *struct {
		Address      string `json:"address"`
		ShortAddress string `json:"short_address"`
	} `json:"geo_address_info"`
}

type LumaEntry struct {
	Event LumaEvent `json:"event"`
}

type LumaResponse struct {
	Entries []LumaEntry `json:"entries"`
}

type NextEvent struct {
	Name     string `json:"name"`
	StartAt  string `json:"start_at"`
	URL      string `json:"url"`
	Location string `json:"location"`
}

type Output struct {
	Entries []NextEvent `json:"entries"`
}

func NextEventHandler(w http.ResponseWriter, r *http.Request) {
	cal := r.URL.Query().Get("calendar")
	if cal == "" {
		w.Write([]byte("missing calendar query parameter"))

		panic("missing calendar query parameter")
	}

	u := "https://api.luma.com/calendar/get-items?" + url.Values{
		"calendar_api_id":  {cal},
		"period":           {"future"},
		"pagination_limit": {"1"},
	}.Encode()

	resp, err := http.Get(u)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	var lr LumaResponse
	if err := json.Unmarshal(body, &lr); err != nil {
		panic(err)
	}

	output := Output{}

	if len(lr.Entries) > 0 {
		evt := lr.Entries[0].Event

		loc := ""
		if evt.GeoAddr != nil {
			loc = evt.GeoAddr.Address
			if loc == "" {
				loc = evt.GeoAddr.ShortAddress
			}
		}

		output.Entries = []NextEvent{{
			Name:     evt.Name,
			StartAt:  evt.StartAt,
			URL:      evt.URL,
			Location: loc,
		}}
	}

	j, err := json.Marshal(output)
	if err != nil {
		panic(err)
	}

	fmt.Fprintf(w, "%v", string(j))
}

func Handler(w http.ResponseWriter, r *http.Request) {
	NextEventHandler(w, r)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	origin := os.Getenv("CORS_ORIGIN")
	if origin == "" {
		origin = "*"
	}

	http.HandleFunc("/next-event", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		Handler(w, r)
	})

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), nil); err != nil {
		log.Fatal(err)
	}
}
