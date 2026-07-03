# Volné reklamní plochy — zprovoznění (Supabase)

Veřejná stránka `volne-plochy.html` a administrace `admin.html` běží na **Supabase**
(Auth + Database + Storage). Žádný server nepotřebuješ — vše je statické + Supabase.
Změny uložené v administraci se **hned** projeví na veřejné stránce.

## 1) Založ projekt Supabase (zdarma)
1. Jdi na <https://supabase.com> → **New project** (region: **Frankfurt / EU**).
2. Vymysli si silné heslo k databázi (ulož si ho).

## 2) Vlož SQL schéma
V Supabase → **SQL Editor** → **New query** → vlož **celý obsah** souboru
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.
Tím se vytvoří tabulka `plochy`, bezpečnostní pravidla (RLS) i úložiště fotek.

## 3) Doplň klíče do webu
V Supabase → **Project Settings → Data API** (URL) a **API Keys** (anon/public key).
Otevři **`js/supabase-config.js`** a nahraď:
```js
window.SUPABASE_URL = 'https://TVUJ-PROJEKT.supabase.co';
window.SUPABASE_ANON_KEY = 'anon-public-klic...';
```
> Obě hodnoty jsou **veřejné** (patří do prohlížeče) — to je v pořádku, bezpečnost
> zajišťuje RLS + přihlášení. **Nikdy** sem nedávej `service_role` / secret key!

## 4) Vytvoř si přihlášení do administrace
Supabase → **Authentication → Users → Add user** →
zadej svůj **e‑mail + heslo** a zaškrtni **Auto Confirm User**.
(Volitelně Authentication → Providers → Email: vypni „Confirm email", ať se nemusíš potvrzovat.)

## 5) Nasaď a vyzkoušej
1. Pushni na GitHub → Vercel se přebuilduje.
2. Otevři **`/admin.html`**, přihlas se, klikni **+ Přidat plochu**, nahraj fotky, ulož.
3. Otevři **`/volne-plochy.html`** — plocha je hned vidět. 🎉

## Administrace umí
- ➕ přidat / ✏️ upravit / 🗑️ smazat plochu
- 📷 nahrát a mazat fotky (první = hlavní/titulní), Storage se čistí i při mazání
- 🔴 přepnout **Volná / Obsazená** (obsazené se na webu přesunou do sekce „Obsazené")
- 👁️ **skrýt** plochu z webu · 📌 **připnout** nahoru
- upravit adresu, GPS/mapu, rozměry a popis

## Bezpečnost
- Na veřejném webu **není žádný odkaz ani tlačítko na přihlášení**.
- `admin.html` je v `robots.txt` (Disallow) a má `noindex` — nebude ve vyhledávačích.
- I kdyby někdo adresu `/admin.html` uhodl, **bez přihlášení nic neudělá** (RLS).
- Pro vyšší nenápadnost můžeš `admin.html` klidně přejmenovat (např. `sprava-2731.html`)
  — pak jen uprav i `Disallow` v `robots.txt`.

## Poznámka k limitům (free tier)
Storage 1 GB a databáze 500 MB bohatě stačí. Fotky doporučuji nahrávat rozumně velké
(cca do 1–2 MB/ks); klidně je před nahráním zmenši.
