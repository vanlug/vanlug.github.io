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
	prosemirror "github.com/nicksrandall/prosemirror-go"
	"golang.org/x/sync/errgroup"
)

//go:embed feed_entry.html.tmpl
var feedEntryTmplStr string

var feedEntryTmpl = template.Must(
	template.New("feed_entry").
		Funcs(template.FuncMap{
			"safeHTML": func(s string) template.HTML {
				return template.HTML(s)
			},
		}).
		Parse(feedEntryTmplStr))

type feedEntryData struct {
	CoverURL        string `json:"cover_url,omitempty"`
	CoverURLPreview string `json:"-"`
	Name            string `json:"name"`
	DateLine        string `json:"date_line"`
	TimeLine        string `json:"time_line"`
	Location        string `json:"location,omitempty"`
	FullAddress     string `json:"full_address,omitempty"`
	Hosts           string `json:"hosts,omitempty"`
	Admission       string `json:"admission,omitempty"`
	Description     string `json:"description,omitempty"`
	Link            string `json:"link"`
	MapURL          string `json:"map_url,omitempty"`
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

func buildEntryData(item EventItem, description string, lumaBase string, mapBase string) feedEntryData {
	now := time.Now()

	link := lumaBase
	if item.URL != "" {
		link = lumaBase + "/" + item.URL
	}

	startTime := now
	if t, err := time.Parse(time.RFC3339, item.StartAt); err == nil {
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
		mapURL = fmt.Sprintf("%s?clic=%.5f%%7C%.5f#16/%.5f/%.5f",
			mapBase, item.Latitude, item.Longitude, item.Latitude, item.Longitude)
	}

	return feedEntryData{
		CoverURL:    item.CoverURL,
		Name:        item.Name,
		DateLine:    dateLine,
		TimeLine:    timeLine,
		Location:    item.Location,
		FullAddress: item.FullAddress,
		Hosts:       strings.Join(item.Hosts, ", "),
		Admission:   admission,
		Description: description,
		Link:        link,
		MapURL:      mapURL,
	}
}

type eventDetailResponse struct {
	CoverURL    string  `json:"cover_url,omitempty"`
	Name        string  `json:"name"`
	StartAt     string  `json:"start_at"`
	EndAt       string  `json:"end_at,omitempty"`
	Timezone    string  `json:"timezone,omitempty"`
	Location    string  `json:"location,omitempty"`
	FullAddress string  `json:"full_address,omitempty"`
	Hosts       string  `json:"hosts,omitempty"`
	Admission   string  `json:"admission,omitempty"`
	Description string  `json:"description,omitempty"`
	Link        string  `json:"link"`
	MapURL      string  `json:"map_url,omitempty"`
	Latitude    float64 `json:"latitude,omitempty"`
	Longitude   float64 `json:"longitude,omitempty"`
}

func EventDetailHandler(w http.ResponseWriter, r *http.Request, eventDetailBase string, lumaBase string, mapBase string) {
	eventAPIId := r.URL.Query().Get("event_api_id")
	if eventAPIId == "" {
		http.Error(w, "missing event_api_id query parameter", http.StatusBadRequest)
		return
	}

	resp, err := http.Get(eventDetailBase + "?" + url.Values{"event_api_id": {eventAPIId}}.Encode())
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	var raw struct {
		LumaEventDetail
		Event      LumaEvent      `json:"event"`
		Hosts      []LumaHost     `json:"hosts"`
		TicketInfo LumaTicketInfo `json:"ticket_info"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		panic(err)
	}

	var descHTML string
	if raw.DescriptionMirror != nil {
		cfg := prosemirror.NewHTMLConfig()
		cfg.MarkRenderers["bold"] = prosemirror.SimpleOption{Before: "<strong>", After: "</strong>"}
		state := &prosemirror.EditorState{Doc: raw.DescriptionMirror}
		descHTML = prosemirror.Render(state, cfg)
	}

	evt := raw.Event

	link := lumaBase
	if evt.URL != "" {
		link = lumaBase + "/" + evt.URL
	}

	loc := ""
	fullAddr := ""
	if evt.GeoAddr != nil {
		loc = evt.GeoAddr.Address
		if loc == "" {
			loc = evt.GeoAddr.ShortAddress
		}
		fullAddr = evt.GeoAddr.FullAddress
	}

	var lat, lng float64
	if evt.Coordinate != nil {
		lat = evt.Coordinate.Latitude
		lng = evt.Coordinate.Longitude
	}

	var mapURL string
	if lat != 0 && lng != 0 {
		mapURL = fmt.Sprintf("%s?clic=%.5f%%7C%.5f#16/%.5f/%.5f",
			mapBase, lat, lng, lat, lng)
	}

	var hosts []string
	for _, h := range raw.Hosts {
		name := h.FirstName + " " + h.LastName
		if name == " " {
			name = h.Name
		}
		hosts = append(hosts, name)
	}

	var admission string
	if raw.TicketInfo.IsFree {
		admission = "Free"
		if raw.TicketInfo.IsSoldOut {
			admission += " (Sold out)"
		} else if raw.TicketInfo.SpotsRemaining > 0 {
			admission += fmt.Sprintf(" (%d spots remaining)", raw.TicketInfo.SpotsRemaining)
		}
	}

	data := eventDetailResponse{
		CoverURL:    evt.CoverURL,
		Name:        evt.Name,
		StartAt:     evt.StartAt,
		EndAt:       evt.EndAt,
		Timezone:    evt.Timezone,
		Location:    loc,
		FullAddress: fullAddr,
		Hosts:       strings.Join(hosts, ", "),
		Admission:   admission,
		Description: descHTML,
		Link:        link,
		MapURL:      mapURL,
		Latitude:    lat,
		Longitude:   lng,
	}

	j, err := json.Marshal(data)
	if err != nil {
		panic(err)
	}

	fmt.Fprintf(w, "%v", string(j))
}

func EventsFeedHandler(w http.ResponseWriter, r *http.Request, apiBase string, eventDetailBase string, lumaBase string, mapBase string, siteURL string, apiURL string) {
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
		data := buildEntryData(item, descriptions[i], lumaBase, mapBase)

		if data.CoverURL != "" {
			data.CoverURLPreview = apiURL + "/image?" + url.Values{"url": {data.CoverURL}, "size": {"md"}}.Encode()
			data.CoverURL = apiURL + "/image?" + url.Values{"url": {data.CoverURL}, "size": {"lg"}}.Encode()
		}

		published := now
		if t, err := time.Parse(time.RFC3339, item.StartAt); err == nil {
			published = t
		}

		summary := data.DateLine + ", " + data.TimeLine
		if item.Location != "" {
			summary = item.Location + " — " + summary
		}

		var buf bytes.Buffer
		if err := feedEntryTmpl.Execute(&buf, data); err != nil {
			panic(err)
		}

		feedItem := &feeds.Item{
			Title:       item.Name,
			Link:        &feeds.Link{Href: data.Link},
			Description: summary,
			Id:          data.Link,
			Created:     published,
			Updated:     published,
			Content:     buf.String(),
		}

		if data.CoverURLPreview != "" {
			feedItem.Enclosure = &feeds.Enclosure{
				Url: data.CoverURLPreview,
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
