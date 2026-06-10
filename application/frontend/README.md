# application/frontend

Next.js 15 (App Router) frontend per §18 of the BUILD_SPEC. Three views:
`/user` (customer mobile), `/user-management` (Operator), `/admin` (Admin).

## Status

- ✅ **`/user` — customer mobile UI (Phase 6, visual layer).** Mobile-first phone
  shell reproducing the `Sample_UI/` mockups: VCB Digibank home + the VoiceBank
  Inclusive assistant ("An"), and the conversational cards/flows from §13 —
  transaction history & spending insight, bill reminders, cashflow/burn-out
  forecast, fraud alert, open savings, savings goal (gamified), money-transfer
  confirmation (PIN/OTP/face), customer-support escalation, and accessibility
  settings ("Thấu hiểu" personalization + Inclusive modes).
- ⏳ `/user-management`, `/admin` — to be ported from `legacy-dashboard/`.
- ⏳ Live data: screens currently run on mock data (`lib/mock.ts`). The
  WebSocket `ui_card` / `action_required` wiring (§9) and `lib/voiceCall.ts`
  (PCM16 duplex) arrive when the orchestrator is connected.

## Run

```bash
npm install
npm run dev        # http://localhost:18891/user
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Best viewed at a narrow (mobile) width, or in browser device-emulation mode.

## Structure

```
app/
  layout.tsx          # root layout + globals
  page.tsx            # → redirect /user
  user/page.tsx       # phone shell: status bar + screen router + bottom nav
  globals.css         # full mint-green VCB theme + all component styles
components/
  Icon.tsx            # dependency-free inline SVG icon set
  chrome.tsx          # StatusBar, AppHeader, BottomNav
  primitives.tsx      # Robot mascot, Waveform, ChatBubble, Donut/Ring/Sparkline, Toggle
  AssistantBits.tsx   # "An says" block + accessibility action chips
  screens/*.tsx       # one component per card/flow (§13)
lib/
  types.ts            # Screen routing + data types
  mock.ts             # demo data (integer VND), replaces ui_card payloads
```

## legacy-dashboard/

The pre-existing static VCB admin console, kept as the seed for the Operator +
Admin dashboards (§14). Run standalone: `cd legacy-dashboard && python3 -m http.server 8080`.
