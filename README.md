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

1. **Harvest**: stand next to a resource node. Your tool swings automatically.
2. **Carry**: loot flies onto your back. The pack has a capacity (shown above your head).
3. **Sell**: walk onto the DROP OFF pad in front of the lander. Items fly in one by one and pay credits.
4. **Upgrade**: stand on the UPGRADES terminal for Cargo Pack, Tool Power and Thruster Boots.
5. **Build**: stand on a dashed plot and credits flow in until it is built.
6. **Launch**: the launch pad flies you to the next planet.

## Campaign: three planets, then home

| # | Planet   | Resources (cheapest to most valuable)                    | Helpers                |
|---|----------|----------------------------------------------------------|------------------------|
| 1 | Kelvos   | Shards, Ember ore, Glowcaps, Frost spars, Void pearls    | Drone Bay              |
| 2 | Verdra   | Logs, Fire berries, Iron ore, Amber, Gold ore            | Sawmill, Iron Mine     |
| 3 | Duneveil | Cactus water, Sandstone, Copper ore, Fossils, Sunstones  | Skimmer Bay, Excavator |
| 4 | Halcyon  | Sunfruit, Lagoon coral, Skyshell pearls (home planet)    | Habitats, Belt Factory |

On planets 1-3, launching starts the next planet over (credits, upgrades, buildings), but you keep
your cargo and gain for good, per finished planet: +10 cargo slots, +15 speed, +25% on every sale.
After Kelvos you get the **Ion Axe** (trees, bushes, mushrooms, cacti 2x faster), after Verdra the
**Sonic Drill** (rocks, crystals, fossils, clams 1.8x faster). The right tool is picked automatically.

## Halcyon, the home planet

- From now on nothing resets. The rocket flies you to any planet and back; finished planets stay fully built.
- Your cargo comes with you. Unload materials at the **Halcyon Hall** (behind the lander). It holds 150 of each
  material (more with upgrades); anything beyond that is sold for credits.
- On the other planets the drop off becomes a **warehouse** with a **cargo rocket**. Drop offs, drones and belts fill it;
  when 50 items are loaded it flies to the hall by itself (or launch it early from the warehouse panel).
- The **material chest** now travels with you and stands next to your rocket on the other planets. Fill it and it
  empties into the hall when you fly home. Upgrade it at the chest for more room.
- Home buildings cost credits **and materials** from the hall (shown under the plot), e.g. the Haven Bridge needs logs from Verdra.
- The **smelter** (left of the lander) turns iron and copper ore into **ingots**, which the Belt Factory and the belts need.
  Pick ore up at the **ORE PICKUP** pad beside the hall, carry it to the smelter, and the ingots go into the hall.
  After 20 ore brought by hand you can hire a **tractor driver** who runs the ore over by themselves (also while you
  are away). "Hotter furnace" upgrades make it smelt faster.
- **New Haven** (behind the bridge) is the expansion area:
  - **Belt Factory** (iron + copper ingots): unlocks conveyor belts. Install one at any sawmill, mine or excavator
    for 10 iron ingots; it runs into a side input of the warehouse and carries the stock there by itself.
  - **Habitats** (logs, sandstone, ...): 2 beds each. Hire crew there and pick a job (any of the three cheapest
    resources of any planet). On the planet you are on, crew walk to their resource, harvest it like drones and carry
    it to the hall or warehouse. Elsewhere they ship 1 unit to the hall every 8 s. Each eats 1 sunfruit from the hall
    every 40 s; without sunfruit they go hungry and stop.

Progress saves automatically to `localStorage` (under 1 KB). The menu (top right) has a reset.
Saves from earlier versions are migrated automatically.

## Code layout

```
index.html        page shell and HUD markup
css/style.css     HUD, panels, overlays
js/config.js      shared rules: upgrades, plot costs, perks, tools, drones, producers, crew
js/planets.js     every planet: theme, layout, resources, helpers, tier balance, home buildings
js/home.js        crew (working on the current planet) and conveyor belts
js/hub.js         shipping after Halcyon: warehouses, cargo rockets, the hall, the portable chest
js/smelter.js     smelter on Halcyon: ore to ingots, ore pickup, tractor driver
js/audio.js       WebAudio synth sound effects, one sound set per material (no audio files)
js/input.js       keyboard + floating touch joystick
js/save.js        localStorage save/load with safe defaults
js/fx.js          particles, floating numbers, screen shake
js/biomes.js      ground and scenery per region (quarry, gorge, magic forest, ...)
js/world.js       regions, node placement, collision, ground texture
js/render.js      procedural drawing of every object
js/ui.js          credit counter, goal line, upgrade/drone panels, menu
js/game.js        rules and main loop
```

To rebalance, edit `js/config.js` and the `SF.TIERS` table in `js/planets.js`.
To add a planet, add an entry to `SF.PLANETS`: pick a node look (`NODES` in `render.js`, e.g. crystal,
magma, icespire, ironrock, resin, goldvein, mesa, malachite, geode, palm, coral, conch, tree, bush, cactus),
an item look (`ITEMS`), a sound (`snd`: glass, stone, metal, gold, magma, ice, wood, palm, resin, squish,
water, shell, bone, coral, sun), a `biome` for its region (see `js/biomes.js`) and colours. `hard` makes a planet's rarer resources tougher; `pace`
scales its building prices.

All art is drawn with canvas shapes; there are no image files.

## Save tool

`save.html` (next to `index.html`) shows the browser save of this game, lets you copy it to another device or delete it, without starting the game.
