# Income Verifier

FinMD take home assessment

A lightweight browser-based tool that parses a PDF income document and determines whether the applicant's income exceeds **$150,000**.

---

## Live Demo

> Add your GitHub Pages URL here after deploying (see [Deployment](#deployment) below).

---

## Setup

**Requirements:** Node.js ≥ 20

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Other commands

| Command | Description |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checking |

---

## Usage

1. Click the upload zone (or drag and drop) to select a PDF
2. The tool parses the document in-browser and displays one of three results:

| Result | Meaning |
|---|---|
| **Verified** | An income figure was found and it exceeds $150,000 |
| **Not Verified** | An income figure was found and it is $150,000 or below |
| **Unable to Determine** | No clearly labelled income field could be identified |

The exact field and dollar value used for the decision are always shown where available.

---

## Deployment

This project is configured to deploy automatically to **GitHub Pages** via GitHub Actions on every push to `main`.

To enable it:

1. Push this repository to GitHub
2. Go to **Settings → Pages → Source** and set it to **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` will build and deploy automatically

The live URL will be: `https://<your-username>.github.io/<repo-name>/`

> **Note:** The `base` path in the deploy workflow matches the repository name (`/income-verifier/`). If you rename the repo, update the `--base` flag in `.github/workflows/deploy.yml` accordingly.

---

## Approach

### PDF Parsing

PDF text extraction is handled entirely in the browser using [pdfjs-dist](https://github.com/mozilla/pdf.js) — the same engine that powers Firefox's PDF viewer. No file is ever uploaded to a server.

Because pdfjs returns text as a flat list of positioned fragments (not structured lines), the parser groups fragments by their vertical (Y) position to reconstruct logical lines of text before scanning for income fields.

### Income Field Detection

The tool searches each reconstructed line for a known income-related label, checked in priority order:

| Priority | Label matched |
|---|---|
| 1 | Adjusted Gross Income / AGI |
| 2 | Total Income |
| 3 | Net Income |
| 4 | Gross Income |
| 5 | Taxable Income |
| 6 | Annual Income |

The first matching line that also contains a dollar amount (`$X,XXX`) is used for the decision. If no match is found, the result is **Unable to Determine**.

**AGI is given the highest priority** because it is the standard income figure used in tax documents (Form 1040) and most reliably represents what lenders and financial tools consider "income."

### Decision Logic

```
income > $150,000  →  Verified
income ≤ $150,000  →  Not Verified
no income found    →  Unable to Determine
```

---

## Assumptions & Limitations

**Assumptions:**
- Input PDFs are text-based (i.e. digitally created, not scanned images)
- The income figure appears on the same line as its label (e.g. `Adjusted Gross Income: $165,000`)
- A single income figure is sufficient — the tool uses the first high-priority match it finds

**Limitations:**
- **No OCR support** — scanned or image-based PDFs will return Unable to Determine, as pdfjs cannot extract text from images
- **Single-value logic** — the tool does not aggregate multiple income figures (e.g. base salary + bonus)
- **English labels only** — non-English documents are not supported
- **Ambiguous documents** — fields like "Gross Receipts", "Net Profit", and "Revenue" are intentionally excluded because they do not unambiguously represent personal income; these will return Unable to Determine
- **Threshold is hardcoded** at $150,000 and not configurable via the UI

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build tool | Vite 8 |
| PDF parsing | pdfjs-dist 4 |
| Deployment | GitHub Pages via GitHub Actions |
