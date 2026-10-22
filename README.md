# Forma — Azure GPT-4o creative workspace

A responsive React + Tailwind CSS frontend and Python FastAPI backend. Azure GPT-4o provides chat responses, writes static SVG artwork, and describes its artwork in the same generation request. No image generation model or external image API is used.

## 1. Folder structure

```text
AI Image Chatbot/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── main.py             # FastAPI endpoints and Azure integration
│   ├── svg.py              # Static SVG allowlist and validation
│   └── test_svg.py         # Security regression tests
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js      # React, Tailwind, local API proxy
    └── src/
        ├── main.jsx
        ├── App.jsx         # Chat page, sidebar, image studio
        └── styles.css      # Responsive layout and light/dark themes
```

## 2. Requirements and installation

Install **Node.js 20.19+ or 22.12+** and **Python 3.11+**. Create an Azure OpenAI resource and a **GPT-4o deployment** with Chat Completions and JSON mode support. The deployment name can differ from the model name. No credentials are required to build the UI, but AI requests require valid Azure credentials and quota.

From the project root, in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
cd frontend
npm.cmd install
```

On macOS/Linux:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd frontend
npm install
```

Packages: React, React DOM, Vite, Tailwind CSS with the Vite plugin, Lucide icons, React Markdown, and remark-gfm; FastAPI, Uvicorn, HTTPX, Pydantic Settings (loads `.env`), and pytest.

## 3. Configure Azure

Edit **backend/.env**:

```dotenv
AZURE_OPENAI_API_KEY=your-real-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-gpt-4o-deployment-name
AZURE_OPENAI_API_VERSION=2024-10-21
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Use the root Azure resource endpoint or a v1 base URL such as `https://your-resource.services.ai.azure.com/openai/v1/`. Copied v1 URLs ending in `/responses` or `/chat/completions` are also accepted; the backend routes them to Chat Completions and includes the deployment as `model`. The v1 API does not use a dated API version. Set a dated API version supported by your Azure resource. Resource-root endpoints use the versioned REST Chat Completions API and the configured API version. The key is read only by Python; do not place it in a `VITE_` variable or commit `.env`. Restart the backend after changing settings.

Reference: [Microsoft Chat Completions documentation](https://learn.microsoft.com/azure/ai-services/openai/how-to/chatgpt) and [Azure API lifecycle](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/api-version-lifecycle). Both the v1 and dated Azure interfaces are supported.

## 4. Run

Terminal 1, from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd frontend
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. Chat is at `/`; Image Studio is at `/images`. Vite proxies `/api` to port 8000. FastAPI's interactive API documentation is at **http://127.0.0.1:8000/docs**. On macOS/Linux use `.venv/bin/python` and `npm` in the same commands.

## 5. Use the application

- **AI Chat:** type a message and press Enter to send; Shift+Enter inserts a newline. Conversation history is sent to GPT-4o. Start, reopen, and delete conversations in the sidebar. Responses support Markdown, code blocks, tables, and copy. A loading animation appears while GPT-4o responds.
- **Image Studio:** enter a description, select illustration/logo/icon/cartoon and a canvas ratio, then generate. GPT-4o returns JSON with SVG code, a title, and a detailed description. The backend validates the JSON and sanitizes the SVG before returning it. The frontend renders the SVG using an `<img>` Blob URL, never injected HTML. The Code tab shows the sanitized source as plain text. Edit the prompt and generate again, or use Regenerate with the current options.
- **Downloads:** SVG downloads preserve editable vectors. PNG export decodes that same SVG into a browser canvas at its intrinsic dimensions (1024×1024, 1024×768, or 768×1024). No additional API is called.
- **Themes:** switch appearance in the sidebar. The mobile menu opens the same navigation and conversation history.

SVG is suitable for vector illustrations, logos, icons, cartoons, and simple artwork. It does not produce photorealistic images. AI text and SVG output may be imperfect; factual accuracy is not guaranteed. This app has no browsing or retrieval integration.

## 6. Checks and production build

```powershell
.\.venv\Scripts\python.exe -m pytest backend -q
cd frontend
npm.cmd run build
```

`frontend/dist` contains the frontend production bundle. `npm.cmd run preview` is a local build preview; to use its AI endpoints, add the preview origin (normally `http://localhost:4173` / `http://127.0.0.1:4173`) to `ALLOWED_ORIGINS` and restart the backend.

For deployment, FastAPI serves `frontend/dist` itself (with SPA fallback for `/images`) on the same origin as `/api/*` and `/docs`. GitHub Actions (`.github/workflows/deploy.yml`) builds the frontend, runs the backend tests, and deploys both to Azure App Service, which runs `gunicorn --bind=0.0.0.0:8000 --timeout 120 -w 2 -k uvicorn_worker.UvicornWorker backend.main:app`. From the project root, `npm run dev` starts both dev servers and `npm run build` builds the frontend. Set credentials through server environment variables or a backend-only `.env`. This project is a local single-user application: add authentication, per-user storage and quotas, request rate limits, and HTTPS before exposing a paid Azure endpoint publicly.

## API

| Endpoint | Input | Output |
| --- | --- | --- |
| `GET /api/health` | — | Backend status and configuration presence (not a live Azure connectivity test) |
| `POST /api/chat` | `{ "messages": [{ "role": "user", "content": "Hello" }] }` | `{ "content": "..." }` |
| `POST /api/images` | `{ "prompt": "A geometric fox", "style": "Illustration", "ratio": "1:1" }` | `{ "title": "...", "description": "...", "svg": "<svg ...>...</svg>" }` |

The backend handles missing settings, timeouts, connectivity failures, authentication failures, missing deployments, quota limits, Azure filtering/truncation, malformed generated JSON, and invalid SVGs. The frontend displays actionable errors and preserves failed chat input for retry. Responses arrive as complete messages rather than token streams.

## Storage and SVG security

Chats and the theme are stored in this browser's localStorage. They are not synced across devices. Delete chats using their sidebar delete buttons, or clear browser site data. Prompts and conversation context are transmitted to your configured Azure resource. Generated images remain in page memory and are cleared when leaving the Image Studio.

SVG validation rejects DTD and entity declarations before parsing Unicode text with ElementTree, rejects undeclared entity references, and uses a static element/attribute allowlist, local-only gradient/clip references, and bounds on source length, node count, and dimensions. Event attributes and style attributes are removed; scripts, foreignObject, embedded images, CSS, animations, and external URLs are rejected. The frontend displays artwork in an image context for additional isolation. Some advanced SVG features are intentionally unsupported; a rejected output can be regenerated with a simpler prompt.

## Troubleshooting

- **PowerShell blocks npm.ps1:** use `npm.cmd` as shown. Virtual environment activation is unnecessary when invoking its Python directly.
- **Python cannot run:** install Python 3.11+ and ensure `python --version` works; Windows Store aliases may need disabling if they shadow your installation.
- **Azure setup required:** fill in `backend/.env` and restart FastAPI. The app starts without keys so the interface can be explored; it does not simulate AI responses.
- **404 / authentication / 400:** check your resource endpoint, key, GPT-4o deployment name, dated API version, and JSON mode availability. Confirm that the deployment is GPT-4o in Azure; its name alone does not identify its underlying model.
- **SVG rejected / incomplete:** simplify your description or regenerate. Complex scenes can exceed the output budget or use unsupported SVG features.
- **429:** check Azure deployment quota and retry after the rate-limit window.

## Verification in the build workspace

The backend regression suite passes (23 tests), covering Azure endpoint formats, chat and artwork responses with a mocked Azure transport, request validation, upstream errors, and SVG security. The frontend production build and `pip check` also pass. Live Azure requests require working credentials, a deployed model, quota, and network access.

Run the backend from the project root using either the command above or:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Use the `.venv` interpreter consistently; a separate `venv` directory may not contain the dependencies. If port 8000 is already in use, check `http://127.0.0.1:8000/api/health` before starting another backend.
