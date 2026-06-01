# Lila Scheduler

Restaurant shift scheduling app. React + Vite frontend, Supabase backend.

## Run

```
npm run dev
```

## File map

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — auth, dark mode, routes to Admin or Employee dashboard |
| `src/Login.jsx` | Login screen (admin via Supabase email auth, employee via 4-digit PIN) |
| `src/AdminDashboard.jsx` | Admin panel with 6 tabs: Schedule, Rules, Hours, Staff, Handover, Stock |
| `src/EmployeeDashboard.jsx` | Employee view — their shifts, availability input, check-in/out, handover |
| `src/StockTab.jsx` | Stock management — exports `StockAdmin` and `StockEmployee` |
| `src/supabase.js` | Supabase client (env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) |

## Supabase tables

| Table | Key columns |
|-------|-------------|
| `employees` | id, name, pin, role (`employee`\|`extra`), min_days, max_days |
| `shifts` | id, employee_id, day, start_time, end_time, published (bool), week_start (ISO date of Monday) |
| `preferences` | id, employee_id, day, start_time, end_time — employee availability |
| `staffing_rules` | id, day, start_time, end_time, min_staff, max_staff |
| `attendance` | id, employee_id, date, check_in, check_out |
| `handover` | id, task, added_by, added_by_name, completed, completed_by_name, completed_at, deleted, deleted_by_name, deleted_at, created_at |
| `settings` | id (key), value — e.g. `schedule_published_at` |

## Auth model

- **Admin**: Supabase email auth → `{ role: 'admin', email, id }`
- **Employee**: PIN lookup → stored in `localStorage` as `lila_user`
- **Dark mode**: `localStorage` key `lila_dark`

## Theming

CSS variables (set on root div in App.jsx): `--bg`, `--card`, `--raised`, `--input`, `--border`, `--border-soft`, `--border-table`, `--text`, `--text2`, `--text3`, `--text4`.

Brand green: `#44ab51`. Style objects (`card`, `btnPrimary`, `btnSecondary`, `btnDanger`, `btnSmPrimary`, etc.) are defined at the top of each dashboard file — reuse them, don't create new ones.

## Shift time slots

30-min increments from `11:00` to `03:30`. `HOURS` and `HOURS_LATE` arrays are defined in each dashboard file. Week starts on **Monday**; `week_start` is the ISO date string (`YYYY-MM-DD`) of that Monday.

## Key patterns

- Data fetching: `fetchAll(weekFilter)` in AdminDashboard fetches all tables in parallel via `Promise.all`. Pass `viewingWeek` (or null for current week) as the filter.
- Real-time: Supabase channel `admin-realtime` subscribes to `handover`, `shifts`, `attendance` changes.
- Schedule generation: `generateSchedule()` matches employees' preferences against staffing rules, respects `max_days` per employee.
- Employee check-in requires IP match against `RESTAURANT_IP` (`62.195.229.217`) or manual request via handover.
- IP detection: fetched on mount in EmployeeDashboard and stored in component state.
