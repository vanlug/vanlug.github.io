package handlers

import (
	"io"
	"net/http"
	"net/url"
)

var allowedImageHosts = map[string]bool{
	"images.lumacdn.com":             true,
	"s3.us-west-000.backblazeb2.com": true,
}

func ImageProxyHandler(w http.ResponseWriter, r *http.Request) {
	upstream := r.URL.Query().Get("url")
	if upstream == "" {
		http.Error(w, "missing url query parameter", http.StatusBadRequest)
		return
	}

	parsed, err := url.Parse(upstream)
	if err != nil || parsed.Scheme != "https" {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	if !allowedImageHosts[parsed.Host] {
		http.Error(w, "host not allowed", http.StatusForbidden)
		return
	}

	resp, err := http.Get(upstream)
	if err != nil {
		http.Error(w, "failed to fetch media", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "upstream error", resp.StatusCode)
		return
	}

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}

	io.Copy(w, resp.Body)
}
