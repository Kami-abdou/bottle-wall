/*
  All the copy for the page lives here. Edit this file, reload, done.

  Tiny inline markup that works in any text string:
    **bold**                → bold text
    {{verify}}              → a visible "verify" tag (claim not confirmed yet)
    {{verify: some note}}   → the tag with a short note inside it
    ___                     → a fill-in blank (a number we don't have yet)
*/
window.CONTENT = {
  title: "Our building is a video game",

  hero: {
    prompt: "Tap the wall to open the plan.",
    promptPointer: "Click the wall to open the plan.",
    playLabel: "Play Snake",
    canvasDescription:
      "Night view of a residential building. On a balcony, a screen made of 512 plastic bottles, 32 columns by 16 rows, lights up and plays a game of Snake. A person in the street watches and holds up a phone."
  },

  // Update this number as bottles come in. The counter has 512 cells.
  bottles: { collected: 312, goal: 512 },

  parts: [
    // ───────────────────────── Part 3 ─────────────────────────
    {
      id: "wall",
      title: "The bottle wall",
      sections: [
        {
          id: "idea",
          title: "The idea in one line",
          blocks: [
            {
              type: "quote",
              text:
                "We turned 512 empty plastic bottles into a giant screen on our building, and the whole neighbourhood plays Snake on it from their phones."
            }
          ]
        },
        {
          id: "why",
          title: "Why people will care",
          blocks: [
            {
              type: "terms",
              items: [
                ["Instantly visual", "a building that becomes a video game reads in one second on any feed."],
                ["Everyone can join", "scan a QR code, play on the building. The audience becomes the content."],
                ["Scrap to magic", "plastic bottles everyone throws away become a light show. Recycling without preaching."],
                ["Neighbourhood vibe", "kids, grandparents and café regulars playing together. Very Tunisian, very warm."],
                ["“First playable building in Tunisia”", "{{verify: and phrase carefully}}"]
              ]
            }
          ]
        },
        {
          id: "tone",
          title: "Tone and characters",
          blocks: [
            {
              type: "terms",
              items: [
                ["Pure fun", "the channel's “fun project”. Lots of laughs, fails and night shots."],
                ["The crew", "the electronics one, the bottle-collecting team, the coder, and the presenter who negotiates with the neighbours."],
                ["The neighbours", "sceptical at first (“what are you doing with all those bottles?”), then hooked. A great character arc."],
                ["The kids of the street", "the best players and the best reactions — on camera only with their parents' consent."]
              ]
            }
          ]
        },
        {
          id: "recurring",
          title: "Recurring elements",
          blocks: [
            {
              type: "terms",
              items: [
                ["Bottle counter", "“312 / 512 bottles collected”. The live one is at the top of this plan."],
                ["High-score board", "on the wall itself: neighbourhood champions with nicknames."],
                ["Game night", "a fixed weekly evening when the street plays together."],
                ["“Cost so far”", "in TND on screen in every episode."]
              ]
            }
          ]
        },
        {
          id: "season",
          title: "Season arc",
          blocks: [
            { type: "lead", text: "“Our building is a video game”" },
            {
              type: "bigQuestion",
              text:
                "Can we turn trash and a balcony into something that brings a whole neighbourhood outside?"
            },
            {
              type: "timeline",
              episodes: [
                {
                  ep: 0,
                  title: "Teaser (30 s)",
                  what:
                    "Night. A dark building. One bottle lights up… then 512. Snake moves across the facade. Someone in the street holds their phone and laughs.",
                  payoff: "The hook for the whole season"
                },
                {
                  ep: 1,
                  title: "We need 512 bottles",
                  what:
                    "“We're going to build a giant screen. Step one: 512 empty bottles.” Precedents: Blinkenlights (Berlin, 2001), Tetris on MIT's Green Building, the Cira Centre Tetris in Philadelphia (a Guinness record), a Kiel student project {{verify}}. A bottle-hunt race through cafés, neighbours and friends. Mini prototype: 8 × 8 bottles indoors, first Snake on 64 pixels.",
                  payoff:
                    "The mini-wall works. Cliffhanger: “Now we need permission to put 512 of these on the building.”"
                },
                {
                  ep: 2,
                  title: "Convincing the building",
                  what:
                    "The syndic, the neighbours, maybe the municipality — filmed with humour. Promises: brightness cap, off at 23:00, no strobing, moderated messages.",
                  payoff: "The neighbours say yes, and some help build"
                },
                {
                  ep: 3,
                  title: "The build",
                  what:
                    "Frame on the balcony, 512 bottles, 512 LEDs, power by sections, waterproofing. First full night test → half the wall goes dark (power problem) → fix it.",
                  payoff: "The full wall lights up for the first time. Wide shot from the street"
                },
                {
                  ep: 4,
                  title: "Launch night: the street plays",
                  what:
                    "QR poster at the bottom of the building. The first neighbour plays Snake on the facade. Tournament: kids vs. grandparents vs. café regulars. Crowd mode: everyone votes the next move.",
                  payoff: "The reactions, and “___ people played in one night”"
                },
                {
                  ep: 5,
                  title: "Making it smart",
                  what:
                    "Collaborative pixel art for the street, polls, a live derby score. AI side-quest: a filter that understands Tunisian Derja and Arabizi to block insults in messages.",
                  payoff: "The neighbourhood's first collective pixel artwork"
                },
                {
                  ep: 6,
                  title: "Finale: Ramadan nights (or Derby night)",
                  what:
                    "An iftar countdown on the building every evening; after iftar, the street gathers to play. Season stats: players, games, high score, bottles saved from the trash, total cost.",
                  payoff: "“From 512 bottles to the heart of the neighbourhood”"
                }
              ]
            }
          ]
        },
        {
          id: "season-2",
          title: "Season 2 seeds",
          blocks: [
            {
              type: "terms",
              items: [
                ["Daytime upgrade", "P10 LED panels rescued from dead shop signs."],
                ["Whole building", "every window becomes one pixel, Blinkenlights-style, with all the neighbours."],
                ["Festival edition", "take the wall to a cultural or light-art event in the Medina {{verify: which festival and dates}}."],
                ["Links with other projects", "run the wall on solar power, or show another experiment's live counter."]
              ]
            }
          ]
        },
        {
          id: "formats",
          title: "Formats per episode",
          blocks: [
            {
              type: "table",
              head: ["Format", "Use"],
              rows: [
                ["Long video (8–12 min)", "The episodes above"],
                ["Shorts / reels", "Teaser lighting up; “scan and play on a building” POV; kids vs. grandma; the fail when half the wall dies"],
                ["Live", "Game night, live from the street"],
                ["Carousel", "Cost breakdown; scrap → screen before/after"]
              ]
            }
          ]
        },
        {
          id: "moments",
          title: "Headline moments we want",
          blocks: [
            {
              type: "moments",
              items: [
                "512 bottles collected in ___ days",
                "The first full light-up, filmed from the street",
                "A grandmother beating a kid at Snake on a building",
                "___ players in one night",
                "Total cost in TND",
                "The neighbourhood's pixel artwork"
              ]
            }
          ]
        },
        {
          id: "timing",
          title: "Timing",
          blocks: [
            {
              type: "when",
              items: [
                ["October – December 2026", "bottle collection, prototype, permissions, build."],
                ["Winter evenings", "launch (it gets dark early, so shows are longer)."],
                ["Ramadan, around February – March 2027", "the finale (iftar countdown and night gatherings). {{verify: exact dates nearer the time}}"]
              ]
            }
          ]
        },
        {
          id: "how",
          title: "How the wall works",
          blocks: [
            { type: "lead", text: "Technical plan" },
            {
              type: "flow",
              label: "How a move travels from a phone to the bottles",
              steps: [
                { name: "Phone", detail: "QR code → web page, D-pad or swipe" },
                { name: "Game server", detail: "Node.js, renders 32 × 16 frames, ~20 fps", link: "WebSockets" },
                { name: "ESP32 + WLED", detail: "receives live frames", link: "DDP or E1.31" },
                { name: "512 bottles", detail: "one LED pixel per bottle", link: "WS2811 data" }
              ]
            },
            {
              type: "terms",
              items: [
                ["Grid", "32 columns × 16 rows = 512 bottles, one LED pixel per bottle."],
                ["Pixels", "waterproof 12 mm “bullet” pixels (WS2811, IP68) push neatly into bottle necks. Consider 12 V versions to reduce voltage drop across a long wall."],
                ["Power", "at full white, 512 pixels can draw roughly 30 A at 5 V. Cap brightness (30–40%) and inject power at several points so the far end doesn't fade. Mains power supplies stay **indoors**; only low voltage goes outside, with fuses on each section."],
                ["Controller", "an ESP32 running WLED (open-source LED firmware) that receives live frames over the network (DDP or E1.31)."],
                ["Game server", "a small Node.js server holds the game state, renders each 32 × 16 frame (~20 fps) and streams it to the ESP32."],
                ["Phone controller", "scanning the QR code opens a web page with a D-pad/swipe controller connected to the server over WebSockets. No app download."],
                ["Queue", "one player at a time, with a visible “you're next” screen and a time limit per game, so launch night doesn't become a crowd around one phone."],
                ["Crowd mode", "everyone connected votes the next move every half second; the majority wins."],
                ["Messages and pixel art", "everything goes through moderation (automatic AI filter tuned for Derja/Arabizi + a human check) before it appears on the wall."],
                ["Mounting", "a wall of 512 bottles catches wind like a sail — the frame must be fixed very solidly. Clear plastic yellows in strong sun; fine for one season."]
              ]
            }
          ]
        },
        {
          id: "costs",
          title: "Rough cost estimate",
          blocks: [
            { type: "note", text: "In TND. Estimates to check against local prices, not quotes." },
            {
              type: "costs",
              currency: "TND",
              rows: [
                ["512 waterproof bullet pixels (WS2811, IP68)", 400, 900],
                ["Power supplies (2 × high-current, indoor)", 150, 300],
                ["Power injection cable, fuses, connectors", 100, 250],
                ["Frame (treated wood or aluminium + mesh)", 200, 600],
                ["ESP32, level shifter, enclosure", 50, 100],
                ["Waterproof junction boxes, cable glands", 50, 150],
                ["Zip ties, silicone, fixings", 50, 100],
                ["QR poster and signage", 20, 50],
                ["Bottles", 0, 0]
              ]
            },
            {
              type: "p",
              text:
                "This is bigger than the lab's starter budget, so it fits best as a month 2–4 build, not the very first episode."
            }
          ]
        },
        {
          id: "rules",
          title: "Rules for the series",
          blocks: [
            {
              type: "checklist",
              storageKey: "bottlewall.rules.v1",
              items: [
                { id: "syndic", text: "Permission from the syndic and neighbours before mounting" },
                { id: "baladiya", text: "Informal check with the municipality (baladiya)" },
                { id: "brightness", text: "Brightness cap set in firmware" },
                { id: "off-23", text: "Automatic switch-off at 23:00" },
                { id: "no-strobe", text: "No strobing or rapid flashing (road safety, neighbours, photosensitivity)" },
                { id: "moderation", text: "Every message and pixel artwork moderated; nothing political, religious or insulting" },
                { id: "low-voltage", text: "Low voltage outside only; fuses per section; mains supplies indoors" },
                { id: "wind", text: "Frame fixing tested for wind" },
                { id: "kids", text: "Kids on camera only with parents' consent" },
                { id: "precedents", text: "On camera, cite only verified precedents; “first in Tunisia” only once verified" }
              ]
            }
          ]
        },
        {
          id: "open",
          title: "Open questions",
          blocks: [
            {
              type: "questions",
              items: [
                "Which balcony/facade, and who owns the decision?",
                "Where does power come from, and who pays the electricity?",
                "Who keeps the server running on game nights?",
                "Do we want the wall to announce the café opening at the end of the season?"
              ]
            }
          ]
        }
      ]
    },

    // ───────────────────────── Part 4 ─────────────────────────
    {
      id: "bigger",
      title: "The bigger plan",
      sections: [
        {
          id: "cafe-lab",
          title: "The café-lab in one line",
          blocks: [
            {
              type: "quote",
              text:
                "A small team of three engineers that runs playful technology experiments in the real city, films how people react, and grows that audience into a physical café-lab where people come to drink coffee and play with the experiments themselves."
            }
          ]
        },
        {
          id: "roadmap",
          title: "Roadmap",
          blocks: [
            { type: "lead", text: "Six months of audience, then the café" },
            {
              type: "roadmap",
              highlight: 2,
              highlightLabel: "Bottle wall season",
              phases: [
                { n: 1, name: "Launch", when: "Months 0–2", focus: "Starter maker kit, build the tag platform, first 5 experiments, start posting", gate: "A video travels + posting rhythm holds" },
                { n: 2, name: "Grow", when: "Months 2–4", focus: "AI-powered experiments, weekly series, Secret Sign season 1, 3 free brand pilots", gate: "Steady audience + café money secured" },
                { n: 3, name: "Prepare", when: "Months 4–6", focus: "Find the location, start café permits, budget and funding, one pop-up test", gate: "Pop-up works + permits in hand" },
                { n: 4, name: "Open", when: "Month 6+", focus: "Café-lab opens, the Sign reveals the address, workshops + lab", gate: "" }
              ]
            },
            {
              type: "p",
              text:
                "The bottle wall fits Phase 2 as the channel's first big “hero” season, with its Ramadan finale landing just before the café opening."
            }
          ]
        },
        {
          id: "identity",
          title: "Channel identity",
          blocks: [
            {
              type: "p",
              text:
                "Science channels run experiments with chemistry and physics; this one runs them with technology, people and the city. Every video follows six beats:"
            },
            { type: "beats", items: ["question", "hypothesis", "build", "test", "result", "lab note"] },
            {
              type: "p",
              text:
                "Experiments are numbered (EXP-001…), the look is a lab notebook, and failures get posted too. Derja on camera, French and English subtitles."
            }
          ]
        },
        {
          id: "team",
          title: "Team roles",
          blocks: [
            {
              type: "table",
              head: ["Role", "Owns"],
              rows: [
                ["AI & experiments lead", "AI experiments, the Secret Sign scanner, scan data, the wall's Derja filter"],
                ["Platform & build lead", "The tag platform, ESP32 and sensor builds, Wi-Fi devices, the wall's hardware"],
                ["Brand & content lead", "Name, identity, the cipher, filming, editing, posting, partnerships, neighbour relations"]
              ]
            }
          ]
        },
        {
          id: "first-five",
          title: "The first five episodes",
          blocks: [
            {
              type: "ol",
              items: [
                "Does AI speak Derja? — the three founders test AIs on Derja (no budget, no location).",
                "Us vs. AI — who writes the better Derja song hook? Strangers vote blind.",
                "AI invents a drink, baristas make it — three cafés, one AI recipe.",
                "Which café is the most curious? — song stones with NFC tags in five cafés.",
                "The barista compliment chain — one kind note travels across five cafés."
              ]
            }
          ]
        },
        {
          id: "brands",
          title: "Brand experiments: free first, paid later",
          blocks: [
            {
              type: "p",
              text:
                "Three free experiments with real brands, posted as content, then the 4th brand pays. Cap free pilots at three; each must earn permission to post, a testimonial, a budget contact, and real numbers."
            },
            {
              type: "pilots",
              slots: ["Free pilot", "Free pilot", "Free pilot", "Paid"],
              earns: ["permission to post", "a testimonial", "a budget contact", "real numbers"]
            }
          ]
        },
        {
          id: "experiments",
          title: "Experiment index",
          blocks: [
            {
              type: "p",
              text:
                "55 ideas in the playbook. The bottle wall is the season-long version of the “Phones, Wi-Fi and web” and “Hardware” ideas."
            },
            {
              type: "experiments",
              related: ["Phones and web", "Hardware"],
              items: [
                ["EXP-001", "Song stone", "Tap and reveal", "Easy"],
                ["EXP-002", "The Chain", "Tap and reveal", "Easy"],
                ["EXP-003", "#100 wins", "Tap and reveal", "Easy"],
                ["EXP-004", "Time capsule", "Tap and reveal", "Easy"],
                ["EXP-005", "City hunt", "Tap and reveal", "Medium"],
                ["EXP-006", "Living tag", "Tap and reveal", "Easy"],
                ["EXP-007", "Tap-to-vote poster", "Tap and reveal", "Easy"],
                ["EXP-008", "Mood Machine", "AI", "Easy"],
                ["EXP-009", "Talk to the Wall", "AI", "Medium"],
                ["EXP-010", "Tech fortune teller", "AI", "Easy"],
                ["EXP-011", "Human or AI?", "AI", "Easy"],
                ["EXP-012", "Does AI speak Derja?", "AI", "Easy"],
                ["EXP-013", "AI names the drink", "AI", "Easy"],
                ["EXP-014", "Words to image", "AI", "Medium"],
                ["EXP-015", "Us vs. AI", "AI", "Easy"],
                ["EXP-016", "City mood", "AI", "Medium"],
                ["EXP-017", "The AI that disagrees", "AI", "Easy"],
                ["EXP-018", "The Shy Box", "Hardware", "Medium"],
                ["EXP-019", "Street applause meter", "Hardware", "Medium"],
                ["EXP-020", "Musical door", "Hardware", "Easy"],
                ["EXP-021", "Thirsty plant", "Hardware", "Easy"],
                ["EXP-022", "Don't press", "Hardware", "Easy"],
                ["EXP-023", "Heartbeat window", "Hardware", "Medium"],
                ["EXP-024", "Patience box", "Hardware", "Medium"],
                ["EXP-025", "Receipt oracle", "Hardware", "Medium"],
                ["EXP-026", "Phone-free table", "Social", "Medium"],
                ["EXP-027", "Compliment relay", "Social", "Easy"],
                ["EXP-028", "Weekly question", "Social", "Easy"],
                ["EXP-029", "Honesty charger", "Social", "Medium"],
                ["EXP-030", "Strangers' playlist", "Social", "Easy"],
                ["EXP-031", "The wait test", "Social", "Easy"],
                ["EXP-032", "Wi-Fi story", "Phones and web", "Easy"],
                ["EXP-033", "Secret menu portal", "Phones and web", "Medium"],
                ["EXP-034", "Phone orchestra", "Phones and web", "Medium"],
                ["EXP-035", "Crowd light show", "Phones and web", "Medium"],
                ["EXP-036", "Living poster", "Phones and web", "Medium"],
                ["EXP-037", "Recycled phone wall", "Phones and web", "Medium"],
                ["EXP-038", "UV secret", "Light and sound", "Easy"],
                ["EXP-039", "Living window", "Light and sound", "Easy"],
                ["EXP-040", "Shadow swap", "Light and sound", "Hard"],
                ["EXP-041", "Voice-only network", "Light and sound", "Medium"],
                ["EXP-042", "City beat", "Light and sound", "Medium"],
                ["EXP-043", "Do people trust QR codes?", "Data", "Easy"],
                ["EXP-044", "Cute or ugly?", "Data", "Easy"],
                ["EXP-045", "How far does a message go?", "Data", "Medium"],
                ["EXP-046", "The most curious neighbourhood", "Data", "Easy"],
                ["EXP-047", "The Signal (Secret Sign)", "Signature", "Medium"],
                ["EXP-048", "The Whisper Wall", "Signature", "Medium"],
                ["EXP-049", "The anonymous jar", "Signature", "Medium"],
                ["EXP-050", "Ghost phone booth", "Signature", "Medium"],
                ["EXP-051", "Strange lost objects", "Signature", "Easy"],
                ["EXP-052", "Mood button", "Signature", "Easy"],
                ["EXP-053", "The audience decides", "Signature", "Easy"],
                ["EXP-054", "Street test kitchen", "Signature", "Easy"],
                ["EXP-055", "Live city map", "Signature", "Medium"]
              ]
            }
          ]
        },
        {
          id: "every-experiment",
          title: "Rules for every experiment",
          blocks: [
            {
              type: "ul",
              items: [
                "Ask before posting anyone's face; children only with a parent's OK.",
                "Owner's permission before placing or filming anything.",
                "No personal data — anonymous counts only.",
                "Everything people send is moderated.",
                "Link to music, never host it.",
                "Prizes must be real."
              ]
            }
          ]
        }
      ]
    }
  ]
};
