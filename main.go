package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	mastodonhandler "github.com/pojntfx/felicitas.pojtinger.com/api/mastodon"
	"github.com/vanlug/vanlug.github.io/pkg/handlers"
)

const (
	defaultLumaAPIBase         = "https://api.luma.com/calendar/get-items"
	defaultLumaEventDetailBase = "https://api.luma.com/event/get"
	defaultLumaBase            = "https://luma.com"
	defaultMapBase             = "https://cartes.app/"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	handlers.NextEventHandler(w, r, defaultLumaAPIBase)
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

	apiBase := os.Getenv("LUMA_API_BASE")
	if apiBase == "" {
		apiBase = defaultLumaAPIBase
	}

	eventDetailBase := os.Getenv("LUMA_EVENT_DETAIL_BASE")
	if eventDetailBase == "" {
		eventDetailBase = defaultLumaEventDetailBase
	}

	lumaBase := os.Getenv("LUMA_BASE")
	if lumaBase == "" {
		lumaBase = defaultLumaBase
	}

	mapBase := os.Getenv("MAP_BASE")
	if mapBase == "" {
		mapBase = defaultMapBase
	}

	siteURL := os.Getenv("SITE_URL")
	if siteURL == "" {
		siteURL = "https://vanlug.ca/"
	}

	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:" + port
	}

	mastodonServer := os.Getenv("MASTODON_SERVER")
	if mastodonServer == "" {
		mastodonServer = "https://thecanadian.social"
	}
	mastodonClientID := os.Getenv("MASTODON_CLIENT_ID")
	mastodonClientSecret := os.Getenv("MASTODON_CLIENT_SECRET")
	mastodonAccessToken := os.Getenv("MASTODON_ACCESS_TOKEN")

	cors := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "public, max-age=300")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next(w, r)
		}
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/next-event", cors(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Println("Error occured in next-event API:", err)

				http.Error(w, "Error occured in next-event API", http.StatusInternalServerError)

				return
			}
		}()

		handlers.NextEventHandler(w, r, apiBase)
	}))

	mux.HandleFunc("/events", cors(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Println("Error occured in events API:", err)

				http.Error(w, "Error occured in events API", http.StatusInternalServerError)

				return
			}
		}()

		handlers.EventsHandler(w, r, apiBase)
	}))

	mux.HandleFunc("/events/feed", cors(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Println("Error occured in events feed API:", err)

				http.Error(w, "Error occured in events feed API", http.StatusInternalServerError)

				return
			}
		}()

		handlers.EventsFeedHandler(w, r, apiBase, eventDetailBase, lumaBase, mapBase, siteURL, apiURL)
	}))

	mux.HandleFunc("/events/detail", cors(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Println("Error occured in event detail API:", err)

				http.Error(w, "Error occured in event detail API", http.StatusInternalServerError)

				return
			}
		}()

		handlers.EventDetailHandler(w, r, eventDetailBase, lumaBase, mapBase)
	}))

	mux.HandleFunc("/image", cors(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Println("Error occured in image proxy:", err)

				http.Error(w, "Error occured in image proxy", http.StatusInternalServerError)

				return
			}
		}()

		handlers.ImageProxyHandler(w, r)
	}))

	mux.HandleFunc("/mastodon", cors(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Println("Error occured in Mastodon API:", err)

				http.Error(w, "Error occured in Mastodon API", http.StatusInternalServerError)

				return
			}
		}()

		mastodonhandler.MastodonFeedHandler(w, r, mastodonServer, mastodonClientID, mastodonClientSecret, mastodonAccessToken)
	}))

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), mux); err != nil {
		log.Fatal(err)
	}
}
