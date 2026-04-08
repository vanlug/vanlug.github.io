package handlers

import (
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"net/url"

	"github.com/anthonynsimon/bild/imgio"
	"github.com/anthonynsimon/bild/transform"
	_ "golang.org/x/image/webp"
)

var allowedImageHosts = map[string]bool{
	"images.lumacdn.com":             true,
	"s3.us-west-000.backblazeb2.com": true,
}

var sizeWidths = map[string]int{
	"sm": 192,
	"md": 512,
	"lg": 1024,
}

func ImageProxyHandler(w http.ResponseWriter, r *http.Request) {
	upstream := r.URL.Query().Get("url")
	if upstream == "" {
		http.Error(w, "missing url query parameter", http.StatusBadRequest)
		return
	}

	size := r.URL.Query().Get("size")
	if size == "" {
		size = "lg"
	}
	maxWidth, ok := sizeWidths[size]
	if !ok {
		http.Error(w, "invalid size parameter, must be sm, md, or lg", http.StatusBadRequest)
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

	ct := resp.Header.Get("Content-Type")
	w.Header().Set("Cache-Control", "public, max-age=86400")

	switch ct {
	case "image/jpeg", "image/png", "image/webp":
		src, format, err := image.Decode(resp.Body)
		if err != nil {
			http.Error(w, "failed to decode image", http.StatusBadGateway)
			return
		}

		srcW, srcH := src.Bounds().Dx(), src.Bounds().Dy()
		dstW, dstH := srcW, srcH
		if srcW > maxWidth {
			dstW = maxWidth
			dstH = srcH * maxWidth / srcW
		}

		dst := transform.Resize(src, dstW, dstH, transform.Lanczos)

		encoder := imgio.JPEGEncoder(80)
		outFormat := "jpeg"
		if format == "png" {
			encoder = imgio.PNGEncoder()
			outFormat = "png"
		}

		w.Header().Set("Content-Type", "image/"+outFormat)
		encoder(w, dst)

	default:
		if ct != "" {
			w.Header().Set("Content-Type", ct)
		}
		io.Copy(w, resp.Body)
	}
}
