# vanlug.ca

Website for the Vancouver Linux Users Group.

[![Hugo CI](https://git.vanlug.ca/vanlug/vanlug.ca/badges/workflows/hugo.yaml/badge.svg)](https://git.vanlug.ca/vanlug/vanlug.ca/actions?workflow=hugo.yaml)
[![Docker CI](https://git.vanlug.ca/vanlug/vanlug.ca/badges/workflows/docker.yaml/badge.svg)](https://git.vanlug.ca/vanlug/vanlug.ca/actions?workflow=docker.yaml)
![Go Version](https://img.shields.io/badge/go%20version-%3E=1.25-61CFDD.svg)
[![Go Reference](https://pkg.go.dev/badge/git.vanlug.ca/vanlug/vanlug.ca.svg)](https://pkg.go.dev/git.vanlug.ca/vanlug/vanlug.ca)

## Overview

VanLUG is a non-profit user group for Linux professionals, hobbyists, and curious newcomers in the Greater Vancouver area, incorporated in 1999. The site is built with Hugo and PatternFly v6.

It provides the following:

- Home page with next meeting card (fetched from Luma API via a proxy hosted on Railway), "what to expect" cards, and social links
- Events page with upcoming events (fetched from Luma API via a proxy hosted on Railway) and full past event history
- About page with mission, purpose mandates, and board of directors
- Partners page listing library and community venue partners
- Resources page with speaker slides, AGM documents, learning links, and design system
- Membership page with benefits and registration link (Luma)
- Code of Conduct, Terms of Service, and Privacy Policy pages
- Donate card and land acknowledgment in the footer

The site is accessible at [https://vanlug.ca/](https://vanlug.ca/).

## Screenshots

Click on an image to see a larger version.

<a display="inline" href="./docs/home.png?raw=true">
<img src="./docs/home.png" width="45%" alt="Screenshot of the home page" title="Screenshot of the home page">
</a>

<a display="inline" href="./docs/events.png?raw=true">
<img src="./docs/events.png" width="45%" alt="Screenshot of the events page" title="Screenshot of the events page">
</a>

<a display="inline" href="./docs/about.png?raw=true">
<img src="./docs/about.png" width="45%" alt="Screenshot of the about page" title="Screenshot of the about page">
</a>

<a display="inline" href="./docs/resources.png?raw=true">
<img src="./docs/resources.png" width="45%" alt="Screenshot of the resources page" title="Screenshot of the resources page">
</a>

<a display="inline" href="./docs/partners.png?raw=true">
<img src="./docs/partners.png" width="45%" alt="Screenshot of the partners page" title="Screenshot of the partners page">
</a>

<a display="inline" href="./docs/membership.png?raw=true">
<img src="./docs/membership.png" width="45%" alt="Screenshot of the membership page" title="Screenshot of the membership page">
</a>

## Acknowledgements

- [gohugoio/hugo](https://github.com/gohugoio/hugo) provides the static site generator.
- The open source [PatternFly design system](https://www.patternfly.org/) provides the UI components.
- [FortAwesome/Font-Awesome](https://github.com/FortAwesome/Font-Awesome) provides the icons.
- [Luma](https://luma.com/home) provides the event calendar and API.

## Contributing

To contribute, please use the [Codeberg flow](https://docs.codeberg.org/collaborating/) and follow our [Code of Conduct](https://vanlug.ca/conduct/).

To build the site locally, run:

```shell
$ git clone https://git.vanlug.ca/vanlug/vanlug.ca
$ cd vanlug.ca
$ npm install
$ hugo server
```

## License

vanlug.ca (c) 2026 Felicitas Pojtinger and contributors

SPDX-License-Identifier: AGPL-3.0-or-later
