# Site update draft — October 2026 resume

Portfolio content lives in the Supabase `sections` table (`props` jsonb), so
these changes are data, not code. Nothing here needs a redeploy.

Style follows the live content: lowercase, short bullets, no trailing periods,
acronyms (UI, DAU, POS) in caps. Dates and `description` aren't rendered by the
components, so they're left out (or included only for future use).

| Section | Based on live data? |
| --- | --- |
| hero `bio` | no, but only `bio` is replaced; `actions` untouched |
| `experience_list` | **yes**, diffed against what you pasted |
| `project_list` | **no**. Dump it and check before running |

```sql
select id, type, jsonb_pretty(props) from sections where type in ('hero', 'project_list');
```

---

## 1. Hero (`hero`): `props.bio`

```json
[
  "hey there! i'm **tony**, a software engineer at [**Block**](//block.xyz).",
  "these days i build mobile and full-stack products for Square. before that, i spent two years at **Roblox** working on creation and sharing, including the launch of Roblox Moments.",
  "outside of work i build small things on the edge, like [2nty](https://2nty.app), a daily twenty questions game, and [splitter](/splitter), a no-login bill splitter.",
  "check out what i've worked on below, or reach out via email."
]
```

## 2. Experience (`experience_list`): `props.children`

Changes vs. live:

- **block:** replaces "building in progress..." with four bullets from the resume.
- **roblox:** adds the two stats from the resume (1.68M DAU, 15% of sales). The
  content-sharing bullet keeps your wording: "added desktop support" is more
  specific than the resume's "worked on".
- **crbm @ uw, shapelab @ uw:** unchanged (not on the resume, kept as-is).

```json
[
  {
    "actions": [],
    "company": "block",
    "current": true,
    "job_title": "software engineer",
    "highlights": [
      "built the mobile foundation for square's bundled releases: feature flags, in-app release notes, and scheduling",
      "designed and built the platform that writes and publishes those release notes",
      "led mobile architecture for managerbot with a hybrid webview/native approach across POS verticals",
      "shipped lending and bill pay features across iOS, android, and backend"
    ]
  },
  {
    "actions": [
      {
        "href": "//about.roblox.com/newsroom/2025/09/roblox-moments-user-generated-discovery",
        "icon": "link",
        "type": "link",
        "label": "roblox moments"
      }
    ],
    "company": "roblox",
    "job_title": "software engineer",
    "highlights": [
      "led front-end development efforts for the roblox moments showcase experience, peaking at 1.68M DAU",
      "added desktop support for the on-platform content sharing project",
      "implemented inspect & buy for the haunt, contributing 15% of total sales during the seasonal event"
    ]
  },
  {
    "actions": [
      {
        "href": "//reproducibilityportal.org",
        "icon": "link",
        "type": "link",
        "label": "reproducibility portal"
      }
    ],
    "company": "crbm @ uw",
    "job_title": "software engineer",
    "highlights": [
      "designed and developed a web UI for biology researchers to access published articles and associated models/simulation in biosimulations"
    ]
  },
  {
    "actions": [
      {
        "href": "//depts.washington.edu/shapelab",
        "icon": "link",
        "type": "link",
        "label": "lab website"
      }
    ],
    "company": "shapelab @ uw",
    "job_title": "student assistant",
    "highlights": [
      "designed server infrastructure",
      "rebuilt lab website",
      "setup and maintain on-site nas"
    ]
  }
]
```

## 3. Projects (`project_list`): `props.children`

Not yet checked against live data. 2nty is new. Splitter is probably already
listed, so keep its live `image_path` and `actions` over these.

```json
[
  {
    "title": "2nty",
    "subtitle": "daily twenty questions game",
    "description": "a daily twenty questions game on cloudflare workers and durable objects, with shared answer caching, signed game tokens, and live crowd stats",
    "image_path": "2nty.png",
    "actions": [
      { "type": "link", "label": "play", "href": "//2nty.app", "icon": "external-link" }
    ]
  },
  {
    "title": "splitter",
    "subtitle": "no-login bill splitter",
    "description": "receipt photos to line items with a vision model (in-browser OCR fallback), and expiring share links with rich previews",
    "image_path": "splitter.png",
    "actions": [
      { "type": "link", "label": "open", "href": "/splitter", "icon": "external-link" }
    ]
  }
]
```

`image_path` resolves against the public `images` bucket. Upload a `2nty.png`
first, or set it to `null` and the card renders without an image.
(`splitter.png` is a guess.)

---

## SQL to apply

Dollar-quoted so apostrophes don't need escaping.

```sql
begin;

update sections
set props = jsonb_set(props, '{bio}', $json$[
  "hey there! i'm **tony**, a software engineer at [**Block**](//block.xyz).",
  "these days i build mobile and full-stack products for Square. before that, i spent two years at **Roblox** working on creation and sharing, including the launch of Roblox Moments.",
  "outside of work i build small things on the edge, like [2nty](https://2nty.app), a daily twenty questions game, and [splitter](/splitter), a no-login bill splitter.",
  "check out what i've worked on below, or reach out via email."
]$json$::jsonb)
where type = 'hero';

update sections
set props = jsonb_set(props, '{children}', $json$[
  {
    "actions": [],
    "company": "block",
    "current": true,
    "job_title": "software engineer",
    "highlights": [
      "built the mobile foundation for square's bundled releases: feature flags, in-app release notes, and scheduling",
      "designed and built the platform that writes and publishes those release notes",
      "led mobile architecture for managerbot with a hybrid webview/native approach across POS verticals",
      "shipped lending and bill pay features across iOS, android, and backend"
    ]
  },
  {
    "actions": [
      {
        "href": "//about.roblox.com/newsroom/2025/09/roblox-moments-user-generated-discovery",
        "icon": "link",
        "type": "link",
        "label": "roblox moments"
      }
    ],
    "company": "roblox",
    "job_title": "software engineer",
    "highlights": [
      "led front-end development efforts for the roblox moments showcase experience, peaking at 1.68M DAU",
      "added desktop support for the on-platform content sharing project",
      "implemented inspect & buy for the haunt, contributing 15% of total sales during the seasonal event"
    ]
  },
  {
    "actions": [
      {
        "href": "//reproducibilityportal.org",
        "icon": "link",
        "type": "link",
        "label": "reproducibility portal"
      }
    ],
    "company": "crbm @ uw",
    "job_title": "software engineer",
    "highlights": [
      "designed and developed a web UI for biology researchers to access published articles and associated models/simulation in biosimulations"
    ]
  },
  {
    "actions": [
      {
        "href": "//depts.washington.edu/shapelab",
        "icon": "link",
        "type": "link",
        "label": "lab website"
      }
    ],
    "company": "shapelab @ uw",
    "job_title": "student assistant",
    "highlights": [
      "designed server infrastructure",
      "rebuilt lab website",
      "setup and maintain on-site nas"
    ]
  }
]$json$::jsonb)
where type = 'experience_list';

-- project_list: check the live row first (see the query at the top).
update sections
set props = jsonb_set(props, '{children}', $json$[
  {
    "title": "2nty",
    "subtitle": "daily twenty questions game",
    "description": "a daily twenty questions game on cloudflare workers and durable objects, with shared answer caching, signed game tokens, and live crowd stats",
    "image_path": "2nty.png",
    "actions": [
      { "type": "link", "label": "play", "href": "//2nty.app", "icon": "external-link" }
    ]
  },
  {
    "title": "splitter",
    "subtitle": "no-login bill splitter",
    "description": "receipt photos to line items with a vision model (in-browser OCR fallback), and expiring share links with rich previews",
    "image_path": "splitter.png",
    "actions": [
      { "type": "link", "label": "open", "href": "/splitter", "icon": "external-link" }
    ]
  }
]$json$::jsonb)
where type = 'project_list';

commit;
```

---

## Other things the new resume touches

- **Resume PDF:** re-upload to the `files` bucket as `jhyn_resume.pdf`
  (served at `/files/resume.pdf`).
- **`/AGENTS.md`:** that briefing is also stored in the `files` bucket. If it
  lists projects or roles, add 2nty and the Block details. Per CLAUDE.md, if
  the prose changes, re-check that `use=full` in `robots.txt` still fits.
- **`/llms.txt`:** generated in `app/files/routes/llms.txt.ts`. 2nty is
  off-site so it isn't a route, but it could go under an "elsewhere" heading.
  That's a code change.

## Resume nits spotted while drafting

- Block bullet 2: "publishes those release notes, PM copy approvals, …" is
  missing a "with" before the list.
- Roblox bullet 1: "Highly anticipated launch with a peak DAU of 1.68M." is a
  fragment. Could fold into the previous sentence ("…, launching to a peak
  DAU of 1.68M").
