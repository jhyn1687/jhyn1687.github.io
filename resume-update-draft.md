# Site update draft — October 2026 resume

Portfolio content lives in the Supabase `sections` table (`props` jsonb), so
these changes are data, not code. Nothing here needs a redeploy.

> **I couldn't see the live content** — jhyn.dev and Supabase aren't reachable
> from the session that drafted this. Dump the current rows first and diff
> against the drafts below before running anything, so we don't drop an item
> that's on the site but not on the resume.
>
> ```sql
> select id, type, "order", visible, jsonb_pretty(props) from sections order by "order";
> ```

Shapes follow the components: `ExperienceCard` renders `job_title`, `company`,
`highlights`, `actions`, `current`; `ProjectCard` renders `title`, `subtitle`,
image, `actions`. **Dates and `description` aren't rendered** (description is in
the type but unused), so I've kept highlights short. They're `text-sm` bullets
and full resume lines would wrap to 3–4 lines on mobile.

---

## 1. Hero (`hero`): `props.bio`

Markdown paragraphs. `actions` are left untouched.

```json
[
  "Hey there! I'm **Tony**, a Software Engineer at **Block**, where I build mobile and full-stack products for Square.",
  "Before that I spent two years at **Roblox** working on creation and sharing, including the launch of Roblox Moments.",
  "Outside of work I build small things on the edge, like [2nty](https://2nty.app), a daily Twenty Questions game, and [Splitter](/splitter), a no-login bill splitter.",
  "Check out what I've worked on below, or reach out via email."
]
```

## 2. Experience (`experience_list`): `props.children`

```json
[
  {
    "job_title": "Software Engineer",
    "company": "Block",
    "current": true,
    "highlights": [
      "Built the mobile foundation for Square's Bundled Releases: cross-platform feature flags for coordinated releases, plus in-app release notes and scheduling.",
      "Designed and built the next-gen platform for writing and publishing those release notes, with PM approvals, localization, version history, and CMS integrations.",
      "Led mobile architecture for Managerbot with a hybrid webview/native approach, and shipped native iOS across POS verticals.",
      "Shipped lending and Bill Pay features across iOS, Android, and backend, reducing payment failures and bringing mobile to parity with the web Dashboard."
    ],
    "actions": []
  },
  {
    "job_title": "Software Engineer",
    "company": "Roblox",
    "current": false,
    "highlights": [
      "Led front-end for the Roblox Moments showcase (feed, creation flow, and editing tools like text overlay), launching to a peak of 1.68M DAU.",
      "Built On-Platform Content Sharing, letting users post and share in-experience Captures across Roblox.",
      "Implemented Inspect & Buy for The Haunt, driving 15% of total sales during the seasonal event."
    ],
    "actions": []
  }
]
```

If the live Roblox entry already has `actions` (e.g. a Moments link), carry
them over. Same for any older roles that aren't on the resume. Append them
rather than deleting them.

## 3. Projects (`project_list`): `props.children`

2nty is new. Splitter is probably already listed, so keep its existing
`image_path` and `actions` if they differ from the draft.

```json
[
  {
    "title": "2nty",
    "subtitle": "Daily Twenty Questions game",
    "description": "A daily Twenty Questions game on Cloudflare Workers and Durable Objects, with shared answer caching, signed game tokens, and live crowd stats.",
    "image_path": "2nty.png",
    "actions": [
      { "type": "link", "label": "Play", "href": "https://2nty.app", "icon": "external-link" }
    ]
  },
  {
    "title": "Splitter",
    "subtitle": "No-login bill splitter",
    "description": "Receipt photos to line items with a vision model (in-browser OCR fallback), and expiring share links with rich previews.",
    "image_path": "splitter.png",
    "actions": [
      { "type": "link", "label": "Open", "href": "/splitter", "icon": "external-link" }
    ]
  }
]
```

`image_path` resolves against the public `images` bucket. Upload a `2nty.png`
first, or set it to `null` and the card renders without an image. (`splitter.png`
is a guess; use whatever the live row has.)

---

## SQL to apply (after diffing)

Dollar-quoted so apostrophes don't need escaping. Merge in anything from the
dump you want to keep before running.

```sql
begin;

update sections
set props = jsonb_set(props, '{bio}', $json$[
  "Hey there! I'm **Tony**, a Software Engineer at **Block**, where I build mobile and full-stack products for Square.",
  "Before that I spent two years at **Roblox** working on creation and sharing, including the launch of Roblox Moments.",
  "Outside of work I build small things on the edge, like [2nty](https://2nty.app), a daily Twenty Questions game, and [Splitter](/splitter), a no-login bill splitter.",
  "Check out what I've worked on below, or reach out via email."
]$json$::jsonb)
where type = 'hero';

update sections
set props = jsonb_set(props, '{children}', $json$[
  {
    "job_title": "Software Engineer",
    "company": "Block",
    "current": true,
    "highlights": [
      "Built the mobile foundation for Square's Bundled Releases: cross-platform feature flags for coordinated releases, plus in-app release notes and scheduling.",
      "Designed and built the next-gen platform for writing and publishing those release notes, with PM approvals, localization, version history, and CMS integrations.",
      "Led mobile architecture for Managerbot with a hybrid webview/native approach, and shipped native iOS across POS verticals.",
      "Shipped lending and Bill Pay features across iOS, Android, and backend, reducing payment failures and bringing mobile to parity with the web Dashboard."
    ],
    "actions": []
  },
  {
    "job_title": "Software Engineer",
    "company": "Roblox",
    "current": false,
    "highlights": [
      "Led front-end for the Roblox Moments showcase (feed, creation flow, and editing tools like text overlay), launching to a peak of 1.68M DAU.",
      "Built On-Platform Content Sharing, letting users post and share in-experience Captures across Roblox.",
      "Implemented Inspect & Buy for The Haunt, driving 15% of total sales during the seasonal event."
    ],
    "actions": []
  }
]$json$::jsonb)
where type = 'experience_list';

update sections
set props = jsonb_set(props, '{children}', $json$[
  {
    "title": "2nty",
    "subtitle": "Daily Twenty Questions game",
    "description": "A daily Twenty Questions game on Cloudflare Workers and Durable Objects, with shared answer caching, signed game tokens, and live crowd stats.",
    "image_path": "2nty.png",
    "actions": [
      { "type": "link", "label": "Play", "href": "https://2nty.app", "icon": "external-link" }
    ]
  },
  {
    "title": "Splitter",
    "subtitle": "No-login bill splitter",
    "description": "Receipt photos to line items with a vision model (in-browser OCR fallback), and expiring share links with rich previews.",
    "image_path": "splitter.png",
    "actions": [
      { "type": "link", "label": "Open", "href": "/splitter", "icon": "external-link" }
    ]
  }
]$json$::jsonb)
where type = 'project_list';

commit;
```

> The `project_list` statement is the most likely to overwrite something.
> Check that the live Splitter row's `image_path` and `actions` match before
> running it, along with any other projects you want to keep.

---

## Other things the new resume touches

- **Resume PDF:** re-upload to the `files` bucket as `jhyn_resume.pdf`
  (served at `/files/resume.pdf`).
- **`/AGENTS.md`:** that briefing is also stored in the `files` bucket. If it
  lists projects or roles, add 2nty and the Block details. Per CLAUDE.md, if
  the prose changes, re-check that `use=full` in `robots.txt` still fits.
- **`/llms.txt`:** generated in `app/files/routes/llms.txt.ts`. It already says
  "software engineer at block". 2nty is off-site so it isn't a route, but it
  could go under an "elsewhere" heading. That's a code change. Say the word.

## Resume nits spotted while drafting

- Block bullet 2: "publishes those release notes, PM copy approvals, …" is
  missing a "with" before the list.
- Roblox bullet 1: "Highly anticipated launch with a peak DAU of 1.68M." is a
  fragment. Could fold into the previous sentence ("…, launching to a peak
  DAU of 1.68M").
