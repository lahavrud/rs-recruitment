# UTM Parameter Convention

UTM parameters tell GA4 exactly where a visitor came from. Every external link
shared on behalf of RS Recruiting must include them — without UTMs, GA4 records
the visit as "Direct" and you lose the ability to measure which channels drive
applications.

Use the [Google Campaign URL Builder](https://ga-dev-tools.google.com/campaign-url-builder)
to generate links without typing parameters by hand.

---

## Parameters

| Parameter | What it identifies |
|---|---|
| `utm_source` | The specific platform (linkedin, google, facebook…) |
| `utm_medium` | The channel type (social, paid-social, cpc, email…) |
| `utm_campaign` | The specific post or campaign |

Always use **lowercase kebab-case**. GA4 is case-sensitive — `LinkedIn` and
`linkedin` appear as two separate sources.

---

## Medium values

| Value | When to use |
|---|---|
| `social` | Organic posts — no money spent |
| `paid-social` | Paid ads on social platforms (LinkedIn Ads, Facebook Ads, Instagram) |
| `cpc` | Paid search ads (Google Ads, Bing) — cost-per-click |
| `email` | Email newsletters or outreach |
| `referral` | Links placed on other websites |

---

## Templates by post type

### Individual job post (organic LinkedIn)
```
https://rs-recruiting.com/jobs/{ID}?utm_source=linkedin&utm_medium=social&utm_campaign=job-SLUG
```

`SLUG` = short kebab-case job name, e.g. `frontend-dev-tlv`, `hr-manager-raanana`

**Example:**
```
https://rs-recruiting.com/jobs/42?utm_source=linkedin&utm_medium=social&utm_campaign=job-frontend-dev-tlv
```

---

### General "we're hiring" post (organic LinkedIn)
```
https://rs-recruiting.com/jobs?utm_source=linkedin&utm_medium=social&utm_campaign=hiring-YYYY-MM
```

**Example:**
```
https://rs-recruiting.com/jobs?utm_source=linkedin&utm_medium=social&utm_campaign=hiring-2026-05
```

---

### LinkedIn paid ad (future)
```
https://rs-recruiting.com/jobs/{ID}?utm_source=linkedin&utm_medium=paid-social&utm_campaign=ad-SLUG
```

---

### Google paid search (future)
```
https://rs-recruiting.com/jobs?utm_source=google&utm_medium=cpc&utm_campaign=CAMPAIGN-NAME
```

---

## Where to see results in GA4

**Reports → Acquisition → Traffic Acquisition**

Each `utm_source / utm_medium` pair appears as its own row. From there you can
see how many sessions each channel sent, and how many of those sessions resulted
in an `apply_submit` conversion.
