# Shardfall Outpost

A small top-down harvest-and-haul game. You play an astronaut on the alien planet Kelvos:
mine crystal trees, carry the shards on your back, drop them at the lander for credits,
and spend credits on upgrades and new buildings.

## Run it

No build step and no dependencies.

- **Quickest:** double-click `index.html` to open it in a browser.
- **Local server (recommended for phones on your Wi-Fi):**
  ```
  cd shardfall
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000` (or `http://<your-computer-ip>:8000` on a phone).

Fonts load from Google Fonts when online and fall back to system fonts offline.

## Host it on a Raspberry Pi

Tested setup: Raspberry Pi OS, user `admin`, home `/home/admin`. Any other user works the same way;
just change the paths and `User=` below.

**1. Get the game**
```
sudo apt install -y git python3
cd /home/admin
git clone https://github.com/niiischler/shardfall.git
```

**2. Try it**
```
cd /home/admin/shardfall
python3 -m http.server 8080
```
Find the Pi's address with `hostname -I` and open `http://<pi-ip>:8080` on any device in the same Wi-Fi.
Stop the server with Ctrl+C.

**3. Start it automatically on boot (systemd)**

Create `/etc/systemd/system/shardfall.service`:
```
sudo nano /etc/systemd/system/shardfall.service
```
with this content:
```ini
[Unit]
Description=Shardfall Outpost web server
After=network-online.target
Wants=network-online.target

[Service]
User=admin
WorkingDirectory=/home/admin/shardfall
ExecStart=/usr/bin/python3 -m http.server 8080
Restart=always

[Install]
WantedBy=multi-user.target
```
Then enable it:
```
sudo systemctl daemon-reload
sudo systemctl enable --now shardfall
systemctl status shardfall
```

**Alternative: nginx** (serves on port 80, so the address is just `http://<pi-ip>`)
```
sudo apt install -y nginx
sudo chmod o+x /home/admin
sudo sed -i 's#root /var/www/html;#root /home/admin/shardfall;#' /etc/nginx/sites-available/default
sudo systemctl reload nginx
```
Use either nginx or the systemd service above, not both on the same port.

**4. Update to the newest version**
```
cd /home/admin/shardfall
git pull
```
No restart needed: the server delivers the new files right away, just reload the page in the browser.
Saved progress lives in each browser's `localStorage`, so updates don't erase it.

## Controls

| Action  | Keyboard            | Touch / mouse                    |
|---------|---------------------|----------------------------------|
| Move    | WASD or arrow keys  | Press and drag anywhere (joystick) |
| Harvest | Walk next to a node | same                              |
| Buy     | Number keys 1-3 on a terminal | Tap a card              |

Harvesting, selling and building all happen by standing in the right place.

## The loop

1. **Harvest**: stand next to a resource node. Your plasma pick swings automatically.
2. **Carry**: loot flies onto your back. The pack has a capacity (shown above your head).
3. **Sell**: walk onto the DROP OFF pad in front of the lander. Items fly in one by one and pay credits.
4. **Upgrade**: stand on the UPGRADES terminal for Cargo Pack, Plasma Pick and Thruster Boots.
5. **Build**: stand on a dashed plot and credits flow in until it is built. Each planet has the same chain:
   gate to region 2, helper building, refinery (+50%), gate to region 3, second helper, gates to regions 4 and 5, launch pad.
6. **Travel**: on the built launch pad, launch to the next planet. Credits, upgrades and buildings reset there,
   but every finished planet adds a permanent +25% to all sales ("star charts").

## Planets

| Planet   | Resources (cheapest to most valuable)                      | Helpers                    |
|----------|------------------------------------------------------------|----------------------------|
| Kelvos   | Shards, Ember ore, Glowcaps, Frost spars, Void pearls      | Drone Bay                  |
| Verdra   | Logs, Fire berries, Iron ore, Amber, Gold ore              | Sawmill, Iron Mine         |
| Duneveil | Cactus water, Sandstone, Copper ore, Fossils, Sunstones    | Skimmer Bay, Excavator     |

After Duneveil the tour starts again as Kelvos II, Verdra II, ... with bigger numbers.

Drones/skimmers fly out, harvest the best node nearby and bring the cargo home.
Producers (sawmill, mine, excavator) fill a stock pile on their own; stand on their pad to load it onto your back.
Upgrade either kind at its pad.

Progress saves automatically to `localStorage` (about 200 bytes). The menu (top right) has a reset.
Saves from the first version are migrated automatically.

## Code layout

```
index.html        page shell and HUD markup
css/style.css     HUD, panels, overlays
js/config.js      shared rules: upgrades, plot costs and order, drones, producers
js/planets.js     every planet: theme, layout, five resources, helpers, tier balance
js/audio.js       WebAudio synth sound effects (no audio files)
js/input.js       keyboard + floating touch joystick
js/save.js        localStorage save/load with safe defaults
js/fx.js          particles, floating numbers, screen shake
js/world.js       regions, node placement, collision, ground texture
js/render.js      procedural drawing of every object
js/ui.js          credit counter, goal line, upgrade/drone panels, menu
js/game.js        rules and main loop
```

To rebalance, edit `js/config.js` and the `SF.TIERS` table in `js/planets.js`.
To add a planet, add an entry to `SF.PLANETS`: pick a node look (crystal, rock, clam, tree,
mushroom, bush, cactus, bones) and an item look (gem, chunk, orb, log, cap, drop, bone) for each
resource, plus colours. New looks go into `NODES` / `ITEMS` in `render.js`.

All art is drawn with canvas shapes; there are no image files.
