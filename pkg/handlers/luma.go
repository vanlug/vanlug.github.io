package handlers

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gorilla/feeds"
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

func lumaFetchItems(r *http.Request, apiBase string, limit string) ([]EventItem, error) {
	cal := r.URL.Query().Get("calendar")
	if cal == "" {
		return nil, fmt.Errorf("missing calendar query parameter")
	}

	u := apiBase + "?" + url.Values{
		"calendar_api_id":  {cal},
		"period":           {"future"},
		"pagination_limit": {limit},
	}.Encode()

	resp, err := http.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var lr LumaResponse
	if err := json.Unmarshal(body, &lr); err != nil {
		return nil, err
	}

	var items []EventItem
	for _, entry := range lr.Entries {
		evt := entry.Event

		loc := ""
		if evt.GeoAddr != nil {
			loc = evt.GeoAddr.Address
			if loc == "" {
				loc = evt.GeoAddr.ShortAddress
			}
		}

		items = append(items, EventItem{
			Name:     evt.Name,
			StartAt:  evt.StartAt,
			URL:      evt.URL,
			Location: loc,
			CoverURL: evt.CoverURL,
		})
	}

	return items, nil
}

func lumaJSON(w http.ResponseWriter, r *http.Request, apiBase string, limit string) {
	items, err := lumaFetchItems(r, apiBase, limit)
	if err != nil {
		w.Write([]byte(err.Error()))

		panic(err)
	}

	j, err := json.Marshal(EventOutput{Entries: items})
	if err != nil {
		panic(err)
	}

	fmt.Fprintf(w, "%v", string(j))
}

func NextEventHandler(w http.ResponseWriter, r *http.Request, apiBase string) {
	lumaJSON(w, r, apiBase, "1")
}

func EventsHandler(w http.ResponseWriter, r *http.Request, apiBase string) {
	lumaJSON(w, r, apiBase, "20")
}

func EventsFeedHandler(w http.ResponseWriter, r *http.Request, apiBase string, siteURL string) {
	items, err := lumaFetchItems(r, apiBase, "20")
	if err != nil {
		w.Write([]byte(err.Error()))

		panic(err)
	}

	now := time.Now()

	feed := &feeds.Feed{
		Title:       "VanLUG Events",
		Link:        &feeds.Link{Href: siteURL + "events/"},
		Description: "Upcoming events from the Vancouver Linux Users Group",
		Author:      &feeds.Author{Name: "Vancouver Linux Users Group"},
		Updated:     now,
		Created:     now,
		Id:          siteURL + "events/",
	}

	for _, item := range items {
		link := "https://luma.com/vanlug"
		if item.URL != "" {
			link = "https://luma.com/" + item.URL
		}

		published := now
		if t, err := time.Parse(time.RFC3339, item.StartAt); err == nil {
			published = t
		}

		description := item.StartAt
		if item.Location != "" {
			description = item.Location + " — " + description
		}

		content := "<p>" + html.EscapeString(item.Name) + "</p>"
		if item.Location != "" {
			content += "<p>" + html.EscapeString(item.Location) + "</p>"
		}
		if item.CoverURL != "" {
			content += `<p><img src="` + html.EscapeString(item.CoverURL) + `" alt="` + html.EscapeString(item.Name) + `" /></p>`
		}

		feedItem := &feeds.Item{
			Title:       item.Name,
			Link:        &feeds.Link{Href: link},
			Description: description,
			Id:          link,
			Created:     published,
			Updated:     published,
			Content:     content,
		}

		if item.CoverURL != "" {
			feedItem.Enclosure = &feeds.Enclosure{
				Url:  item.CoverURL,
				Type: "image/jpeg",
			}
		}

		feed.Add(feedItem)
	}

	w.Header().Set("Content-Type", "application/atom+xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=900")

	if err := feed.WriteAtom(w); err != nil {
		panic(err)
	}
}
