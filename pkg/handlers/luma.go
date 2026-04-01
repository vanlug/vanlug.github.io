package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type LumaEvent struct {
	Name     string `json:"name"`
	StartAt  string `json:"start_at"`
	URL      string `json:"url"`
	CoverURL string `json:"cover_url"`
	GeoAddr  *struct {
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

type EventItem struct {
	Name     string `json:"name"`
	StartAt  string `json:"start_at"`
	URL      string `json:"url"`
	Location string `json:"location"`
	CoverURL string `json:"cover_url"`
}

type EventOutput struct {
	Entries []EventItem `json:"entries"`
}

func lumaFetch(w http.ResponseWriter, r *http.Request, apiBase string, limit string) {
	cal := r.URL.Query().Get("calendar")
	if cal == "" {
		w.Write([]byte("missing calendar query parameter"))

		panic("missing calendar query parameter")
	}

	u := apiBase + "?" + url.Values{
		"calendar_api_id":  {cal},
		"period":           {"future"},
		"pagination_limit": {limit},
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

	output := EventOutput{}

	for _, entry := range lr.Entries {
		evt := entry.Event

		loc := ""
		if evt.GeoAddr != nil {
			loc = evt.GeoAddr.Address
			if loc == "" {
				loc = evt.GeoAddr.ShortAddress
			}
		}

		output.Entries = append(output.Entries, EventItem{
			Name:     evt.Name,
			StartAt:  evt.StartAt,
			URL:      evt.URL,
			Location: loc,
			CoverURL: evt.CoverURL,
		})
	}

	j, err := json.Marshal(output)
	if err != nil {
		panic(err)
	}

	fmt.Fprintf(w, "%v", string(j))
}

func NextEventHandler(w http.ResponseWriter, r *http.Request, apiBase string) {
	lumaFetch(w, r, apiBase, "1")
}

func EventsHandler(w http.ResponseWriter, r *http.Request, apiBase string) {
	lumaFetch(w, r, apiBase, "20")
}
