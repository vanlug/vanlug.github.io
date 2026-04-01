package handlers

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/feeds"
	"golang.org/x/sync/errgroup"
	prosemirror "github.com/nicksrandall/prosemirror-go"
)

//go:embed feed_entry.html.tmpl
var feedEntryTmplStr string

var feedEntryTmpl = template.Must(template.New("feed_entry").Parse(feedEntryTmplStr))

type feedEntryData struct {
	CoverURL    string
	Name        string
	DateLine    string
	TimeLine    string
	Location    string
	FullAddress string
	Hosts       string
	Admission   string
	Description template.HTML
	Link        string
	MapURL      string
}

func caTime(s string) string {
	s = strings.ReplaceAll(s, "AM", "a.m.")
	s = strings.ReplaceAll(s, "PM", "p.m.")
	return s
}

type LumaEvent struct {
	APIId    string `json:"api_id"`
	Name     string `json:"name"`
	StartAt  string `json:"start_at"`
	EndAt    string `json:"end_at"`
	Timezone string `json:"timezone"`
	URL      string `json:"url"`
	CoverURL string `json:"cover_url"`
	GeoAddr  *struct {
		Address      string `json:"address"`
		ShortAddress string `json:"short_address"`
		FullAddress  string `json:"full_address"`
		City         string `json:"city"`
	} `json:"geo_address_info"`
	Coordinate *struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"coordinate"`
}

type LumaHost struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Name      string `json:"name"`
}

type LumaTicketInfo struct {
	IsFree          bool `json:"is_free"`
	IsSoldOut       bool `json:"is_sold_out"`
	SpotsRemaining  int  `json:"spots_remaining"`
	RequireApproval bool `json:"require_approval"`
}

type LumaEntry struct {
	Event      LumaEvent      `json:"event"`
	Hosts      []LumaHost     `json:"hosts"`
	TicketInfo LumaTicketInfo `json:"ticket_info"`
}

type LumaResponse struct {
	Entries []LumaEntry `json:"entries"`
}

type EventItem struct {
	APIId          string   `json:"api_id"`
	Name           string   `json:"name"`
	StartAt        string   `json:"start_at"`
	EndAt          string   `json:"end_at"`
	Timezone       string   `json:"timezone"`
	URL            string   `json:"url"`
	Location       string   `json:"location"`
	FullAddress    string   `json:"full_address"`
	City           string   `json:"city"`
	CoverURL       string   `json:"cover_url"`
	Latitude       float64  `json:"latitude,omitempty"`
	Longitude      float64  `json:"longitude,omitempty"`
	Hosts          []string `json:"hosts"`
	IsFree         bool     `json:"is_free"`
	IsSoldOut      bool     `json:"is_sold_out"`
	SpotsRemaining int      `json:"spots_remaining"`
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
		fullAddr := ""
		city := ""
		if evt.GeoAddr != nil {
			loc = evt.GeoAddr.Address
			if loc == "" {
				loc = evt.GeoAddr.ShortAddress
			}
			fullAddr = evt.GeoAddr.FullAddress
			city = evt.GeoAddr.City
		}

		var lat, lng float64
		if evt.Coordinate != nil {
			lat = evt.Coordinate.Latitude
			lng = evt.Coordinate.Longitude
		}

		var hosts []string
		for _, h := range entry.Hosts {
			name := h.FirstName + " " + h.LastName
			if name == " " {
				name = h.Name
			}
			hosts = append(hosts, name)
		}

		items = append(items, EventItem{
			APIId:          evt.APIId,
			Name:           evt.Name,
			StartAt:        evt.StartAt,
			EndAt:          evt.EndAt,
			Timezone:       evt.Timezone,
			URL:            evt.URL,
			Location:       loc,
			FullAddress:    fullAddr,
			City:           city,
			CoverURL:       evt.CoverURL,
			Latitude:       lat,
			Longitude:      lng,
			Hosts:          hosts,
			IsFree:         entry.TicketInfo.IsFree,
			IsSoldOut:      entry.TicketInfo.IsSoldOut,
			SpotsRemaining: entry.TicketInfo.SpotsRemaining,
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

type LumaEventDetail struct {
	DescriptionMirror *prosemirror.Content `json:"description_mirror"`
}

func lumaFetchDescription(eventDetailBase string, eventAPIId string) (string, error) {
	resp, err := http.Get(eventDetailBase + "?" + url.Values{"event_api_id": {eventAPIId}}.Encode())
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var detail LumaEventDetail
	if err := json.Unmarshal(body, &detail); err != nil {
		return "", err
	}

	if detail.DescriptionMirror == nil {
		return "", nil
	}

	cfg := prosemirror.NewHTMLConfig()
	cfg.MarkRenderers["bold"] = prosemirror.SimpleOption{Before: "<strong>", After: "</strong>"}

	state := &prosemirror.EditorState{Doc: detail.DescriptionMirror}
	return prosemirror.Render(state, cfg), nil
}

func EventsFeedHandler(w http.ResponseWriter, r *http.Request, apiBase string, eventDetailBase string, lumaBase string, mapBase string, siteURL string) {
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

	descriptions := make([]string, len(items))
	var g errgroup.Group
	for i, item := range items {
		g.Go(func() error {
			desc, err := lumaFetchDescription(eventDetailBase, item.APIId)
			if err != nil {
				return err
			}
			descriptions[i] = desc
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		w.Write([]byte(err.Error()))

		panic(err)
	}

	for i, item := range items {
		link := lumaBase
		if item.URL != "" {
			link = lumaBase + "/" + item.URL
		}

		published := now
		startTime := now
		if t, err := time.Parse(time.RFC3339, item.StartAt); err == nil {
			published = t
			startTime = t
		}

		var endTime *time.Time
		if item.EndAt != "" {
			if t, err := time.Parse(time.RFC3339, item.EndAt); err == nil {
				endTime = &t
			}
		}

		loc := time.UTC
		if item.Timezone != "" {
			if l, err := time.LoadLocation(item.Timezone); err == nil {
				loc = l
			}
		}

		localStart := startTime.In(loc)
		dateLine := localStart.Format("Monday, January 2, 2006")
		timeLine := caTime(localStart.Format("3:04 PM"))
		if endTime != nil {
			localEnd := endTime.In(loc)
			if localStart.Day() == localEnd.Day() {
				timeLine += " – " + caTime(localEnd.Format("3:04 PM"))
			} else {
				timeLine += " – " + caTime(localEnd.Format("Monday, January 2, 3:04 PM"))
			}
		}
		if item.Timezone != "" {
			timeLine += " " + localStart.Format("MST")
		}

		summary := dateLine + ", " + timeLine
		if item.Location != "" {
			summary = item.Location + " — " + summary
		}

		var admission string
		if item.IsFree {
			admission = "Free"
			if item.IsSoldOut {
				admission += " (Sold out)"
			} else if item.SpotsRemaining > 0 {
				admission += fmt.Sprintf(" (%d spots remaining)", item.SpotsRemaining)
			}
		}

		var mapURL string
		if item.Latitude != 0 && item.Longitude != 0 {
			mapURL = fmt.Sprintf("%s#16/%.6f/%.6f",
				mapBase, item.Latitude, item.Longitude)
		}

		var buf bytes.Buffer
		if err := feedEntryTmpl.Execute(&buf, feedEntryData{
			CoverURL:    item.CoverURL,
			Name:        item.Name,
			DateLine:    dateLine,
			TimeLine:    timeLine,
			Location:    item.Location,
			FullAddress: item.FullAddress,
			Hosts:       strings.Join(item.Hosts, ", "),
			Admission:   admission,
			Description: template.HTML(descriptions[i]),
			Link:        link,
			MapURL:      mapURL,
		}); err != nil {
			panic(err)
		}

		feedItem := &feeds.Item{
			Title:       item.Name,
			Link:        &feeds.Link{Href: link},
			Description: summary,
			Id:          link,
			Created:     published,
			Updated:     published,
			Content:     buf.String(),
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
